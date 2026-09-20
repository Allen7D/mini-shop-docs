# B 端接口 (cms)

给后台管理使用的接口，前缀 `/cms`。源码位于 `app/api/cms/`。

| 模块 | 红图名 | 说明 |
|---|---|---|
| [用户 user](#user) | `cms-user` | 后台用户管理 |
| [权限组 group](#group) | `cms-group` | 接口 / 菜单权限分配 |
| [权限 auth](#auth) | `cms-auth` | 权限点管理 |
| [菜单 menu](#menu) | `cms-menu` | 菜单管理、动态路由 |
| [元素 element](#element) | `cms-element` | 页面元素管理 |
| [文章 article](#article) | `cms-article` | 文章管理 |
| [文件 file](#file) | `cms-file` | 文件夹 / 文件管理 |
| [订单 order](#order) | `cms-order` | 后台订单管理 |
| [轮播图 banner](#banner) | `cms-banner` | 轮播图管理 |
| [通知 notice](#notice) | `cms-notice` | 通知 / 公告 |
| [字典 dict](#dict) | `cms-dict` / `cms-dict_type` | 字典数据管理 |
| [配置 config](#config) | `cms-config` | 系统参数配置 |
| [日志 log](#log) | `cms-oper_log` / `cms-login_log` | 操作 / 登录日志 |
| [异常日志](#log) | `cms-error_log` | 异常日志 |

## user

**后台用户管理**：列表、创建、编辑、删除、分配角色

```
GET    /cms/user?page=1&size=10   (需 Token)
POST   /cms/user                  (需 Token)
PUT    /cms/user/<id>             (需 Token)
DELETE /cms/user/<id>             (需 Token)
```

## group

**权限组（角色）管理**：接口权限和菜单权限的分配

```
GET    /cms/group
POST   /cms/group
PUT    /cms/group/<id>
DELETE /cms/group/<id>
```

## auth

**权限管理**：定义接口权限点，配合权限组使用

```
GET    /cms/auth
GET    /cms/auth/url        (需 Token)
```

## menu

**菜单管理**：实现后端配置菜单动态路由，支持多级菜单

```
GET    /cms/menu
GET    /cms/menu/routes     (需 Token，返回当前角色可见路由)
```

## element

**页面元素管理**：按钮 / 权限点等页面元素

```
GET    /cms/element
POST   /cms/element
```

## article

**文章管理**

```
GET    /cms/article?page=1&size=10
POST   /cms/article
PUT    /cms/article/<id>
DELETE /cms/article/<id>
```

## file

**文件管理**：文件夹和文件的上传/管理

```
GET   /cms/file (查询文件列表)
POST  /cms/file (上传文件)
```

## order

**后台订单管理**：订单列表 / 详情 / 状态变更

```
GET  /cms/order?page=1&size=10
GET  /cms/order/<id>
```

## banner

**轮播图管理**

```
GET    /cms/banner
POST   /cms/banner
DELETE /cms/banner/<id>
```

## notice

**通知 / 公告管理**

```
GET    /cms/notice?page=1&size=10
POST   /cms/notice
PUT    /cms/notice/<id>
DELETE /cms/notice/<id>
```

## dict

**字典（数据类型）管理**

```
GET    /cms/dict_type     # 字典类型
GET    /cms/dict          # 字典数据
POST   /cms/dict
PUT    /cms/dict/<id>
DELETE /cms/dict/<id>
```

## config

**系统参数配置**

```
GET    /cms/config
PUT    /cms/config
```

## log

**日志管理**

```
GET    /cms/oper_log       # 操作日志
GET    /cms/login_log      # 登录日志
GET    /cms/log/error      # 异常日志
```

::: tip
以上接口为按源码模块整理的分类摘要，具体参数与响应请以 [线上 Swagger 文档](http://47.114.33.143:9000/apidocs/) 为准。
:::