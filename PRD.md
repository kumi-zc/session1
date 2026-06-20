# 库存盘点 (Stock Taking) App - PRD

## 1. 产品概述

小店铺/个人使用的库存盘点系统，支持多人协作盘点，自动生成差异报告，管理商品进销存。

## 2. 用户角色

| 角色 | 权限 |
|------|------|
| 管理员 | 全部功能：商品管理、盘点管理、报表查看、用户管理 |
| 盘点员 | 执行盘点、查看自己负责的盘点任务 |

## 3. 核心模块

### 3.1 商品管理 (Inventory)

**字段：**
| 字段 | 类型 | 说明 |
|------|------|------|
| SKU | string (自动生成) | 唯一编码，支持手输或自动生成 |
| 商品名称 | string | 必填 |
| 分类 | enum | 用户自定义分类 |
| 单位 | string | 个/箱/kg 等 |
| 成本价 | decimal | 进货价 |
| 售价 | decimal | 销售价 |
| 安全库存 | int | 低于此值触发预警 |
| 当前库存 | int | 系统自动计算 |
| 存放位置 | string | 货架/区域标记 |

**操作：**
- CRUD 商品
- 批量导入（Excel/CSV）
- 搜索/筛选（按名称、SKU、分类、库存状态）
- 库存预警（低于安全库存标红）

### 3.2 盘点管理 (Stock Taking)

**盘点流程：**

```
创建盘点任务 → 分配盘点区域/人员 → 实盘录入 → 差异比对 → 提交审核 → 调账
```

**盘点单字段：**
| 字段 | 说明 |
|------|------|
| 盘点单号 | 自动生成，ST-YYYYMMDD-XXX |
| 盘点类型 | 全盘 / 分类盘 / 区域盘 |
| 状态 | 待盘点 → 盘点中 → 待审核 → 已完成 / 已调账 |
| 负责人 | 指定盘点员 |
| 盘点区域 | 可选，指定盘点范围 |
| 计划盘点日期 | 开始日期 |
| 实际完成日期 | 系统记录 |

**盘点录入：**
- 逐项录入实盘数量
- 支持搜索快速定位商品
- 已盘/未盘 状态标记
- 实盘数与系统数差异自动计算

**差异处理：**
- 盘盈：实盘数 > 系统数 → 建议入库
- 盘亏：实盘数 < 系统数 → 建议出库
- 审核通过后自动调账（更新库存）

### 3.3 入库/出库 (Stock Movement)

**简单出入库记录：**
| 字段 | 说明 |
|------|------|
| 类型 | 入库 / 出库 / 盘盈入库 / 盘亏出库 |
| 商品 | 关联商品 |
| 数量 | 变动数量 |
| 操作人 | 记录操作人 |
| 时间 | 自动记录 |
| 备注 | 可选说明 |

- 每次出入库自动更新当前库存
- 盘点调账生成的出入库记录标记来源

### 3.4 报表 (Reports)

**4.1 盘点差异报告**
- 本次盘点商品明细（商品名、系统数、实盘数、差异数、差异金额）
- 按分类汇总
- 盘盈/盘亏汇总
- 盈亏金额（基于成本价计算）

**4.2 历史盘点记录**
- 历次盘点列表（时间、类型、差异汇总）
- 点击进入查看详情

**4.3 库存预警**
- 低于安全库存的商品列表
- 缺货/临期预警（如有保质期字段）

**4.4 库存总览**
- 按分类统计库存数量和金额
- 库存周转趋势（月/周维度）

## 4. 技术架构

```
┌─────────────────────────────────┐
│          Frontend (React)        │
│  Vite + React + Ant Design      │
│  React Router + TanStack Query  │
├─────────────────────────────────┤
│          Backend (Node.js)       │
│  Express + Prisma ORM           │
│  JWT Auth + RESTful API         │
├─────────────────────────────────┤
│          Database                │
│  SQLite (开发) / PostgreSQL (生产)│
└─────────────────────────────────┘
```

### 目录结构

```
stock-taking/
├── client/                 # 前端
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/          # 页面
│   │   │   ├── Inventory/  # 商品管理
│   │   │   ├── StockTaking/# 盘点管理
│   │   │   ├── Reports/    # 报表
│   │   │   └── Dashboard/  # 仪表盘
│   │   ├── hooks/          # 自定义 hooks
│   │   ├── services/       # API 调用
│   │   └── utils/          # 工具函数
│   └── package.json
├── server/                 # 后端
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── controllers/    # 控制器
│   │   ├── services/       # 业务逻辑
│   │   ├── prisma/         # 数据库模型
│   │   └── middleware/     # 中间件
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 5. 数据模型

### Product (商品)
```
id          Int       @id @default(autoincrement())
sku         String    @unique
name        String
category    String?
unit        String    @default("个")
costPrice   Decimal   @default(0)
sellPrice   Decimal   @default(0)
safetyStock Int       @default(0)
location    String?
createdAt   DateTime  @default(now())
updatedAt   DateTime  @updatedAt
```

### StockRecord (库存记录 - 当前库存)
```
id          Int       @id @default(autoincrement())
productId   Int       @unique
quantity    Int       @default(0)
product     Product   @relation(fields: [productId], references: [id])
```

### StockTakingTask (盘点任务)
```
id          Int       @id @default(autoincrement())
code        String    @unique  // ST-YYYYMMDD-XXX
type        Enum      // FULL, CATEGORY, AREA
status      Enum      // PENDING, IN_PROGRESS, REVIEWING, COMPLETED, ADJUSTED
assigneeId  Int?
area        String?
plannedDate DateTime
completedAt DateTime?
createdAt   DateTime  @default(now())
```

### StockTakingItem (盘点明细)
```
id          Int       @id @default(autoincrement())
taskId      Int
productId   Int
systemQty   Int       // 系统库存数
actualQty   Int?      // 实盘数（盘点员填写）
status      Enum      // PENDING, COUNTED, REVIEWED
task        StockTakingTask @relation(...)
product     Product   @relation(...)
```

### StockMovement (出入库记录)
```
id          Int       @id @default(autoincrement())
productId   Int
type        Enum      // IN, OUT, STOCK_IN, STOCK_OUT
quantity    Int
source      String?   // "盘点调账" / "手动入库"
operatorId  Int?
remark      String?
createdAt   DateTime  @default(now())
product     Product   @relation(...)
```

### User (用户)
```
id          Int       @id @default(autoincrement())
username    String    @unique
password    String    // bcrypt hash
role        Enum      // ADMIN, COUNTER
createdAt   DateTime  @default(now())
```

## 6. 页面设计

### 6.1 仪表盘 (Dashboard)
- 今日盘点任务数
- 库存预警数量
- 本月盘盈/盘亏汇总
- 最近盘点记录

### 6.2 商品管理
- 商品列表（表格，支持搜索筛选排序）
- 新增/编辑商品弹窗
- 批量导入按钮
- 库存预警列表标签页

### 6.3 盘点管理
- 盘点任务列表
- 新建盘点任务（选类型、范围、分配人员）
- 盘点执行页（逐项录入界面，搜索定位）
- 盘点审核页（差异对比，一键调账）

### 6.4 报表中心
- 盘点差异报告（表格 + 图表）
- 历史记录列表
- 库存预警报表
- 库存总览统计

## 7. MVP 范围（第一期）

| 功能 | 优先级 |
|------|--------|
| 用户注册/登录 | P0 |
| 商品 CRUD | P0 |
| 创建盘点任务（全盘） | P0 |
| 盘点录入（逐项填写实盘数） | P0 |
| 差异自动计算 | P0 |
| 盘点调账（审核后更新库存） | P0 |
| 盘点差异报告 | P0 |
| 库存预警（低于安全库存） | P1 |
| 分类筛选/搜索 | P1 |
| 历史盘点记录 | P1 |
| 批量导入商品 | P2 |
| 多人协作盘点 | P2 |
| 库存趋势图表 | P2 |

## 8. 约束与假设

- 初期用 SQLite 开发，生产切换 PostgreSQL
- 认证用 JWT，无需第三方 OAuth
- 响应式设计，支持手机浏览器操作（方便仓库盘点）
- 不涉及打印、条码扫描硬件对接（MVP 阶段）
- 数据量预期：万级商品，千级盘点记录
