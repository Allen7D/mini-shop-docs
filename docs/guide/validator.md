# 参数校验层

进来的参数先「体检」——不合法就拦在门口，绝不带病进入业务层。这是防止脏数据的守门员。

## 校验器长什么样

校验器放在 `app/validators/`，用 WTForms 定义字段规则 + 自定义校验方法：

```python
# validators/forms.py
class IDMustBePositiveIntValidator(BaseValidator):
    id = IntegerField(validators=[DataRequired()])   # 字段声明 + 必填

    def validate_id(self, value):                    # 自定义校验（固定命名 validate_+字段名）
        if not self.isPositiveInteger(value.data):
            raise ValidationError(message='ID 必须为正整数')
        self.id.data = int(value.data)
```

## 接口里怎么用

```python
def get_product(id):
    # 传一个参数去校验，失败会自动抛 ParameterException
    v = IDMustBePositiveIntValidator().validate_for_api()
    product_id = v.id.data   # 校验通过，拿校验后的值
    return Success(...)
```

## 校验结果会怎样

- 校验通过 → 返回校验器实例，业务层取 `.data` 用（已转成正确类型）
- 校验失败 → 自动抛 `ParameterException`，被全局处理器转成统一的「参数错误」响应

这样接口代码里就没有一堆 if/else 判断参数是否合法了——交给专用校验层处理。

::: tip 命名规律
自定义校验方法必须叫 `validate_<字段名>`（比如字段叫 `id`，方法就叫 `validate_id`）。WTForms 会自动按这个约定调用。这是「约定优于配置」的体现。
:::

::: tip 能带走的思想
校验独立成层，接口代码里没有一堆 if/else 判断参数。这就是**校验前置**：在入口统一拦住非法输入，错误统一格式返回，业务层只处理"已经合法"的数据。任何语言的框架都可以这样做——校验规则声明式描述，跟业务逻辑彻底分开。
:::

下一步：[权限认证 Token](/guide/auth)