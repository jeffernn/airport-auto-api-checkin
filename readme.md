# 机场自动签到脚本

本脚本适用于使用SSPANEL搭建的机场(可能不适用于v2board搭建机场，因为Api地址不一样，可自行抓包替换，只需修改登录和签到API地址即可实现自动签到）

⚠️ **注意**  
由于Cloudflare的Worker分配的网址默认被墙，首次测试打卡是否成功需代理（后期无需）。若使用Cloudflare代理请换其他代理，因为Cloudflare无法给自身代理。
只有配置telegram机器人后才可以签到成功后telegram机器人自动通知

---

## 🚀 使用方法

**项目案例地址**:  
[https://jeffern.workers.dev](https://jeffern.workers.dev)

---

### 🔔 检查TG通知是否成功
在你的worker域名后加/tg后访问,若配置成功Tg机器人会给你发送签到消息（替换参数）：  
`https://jeffern.workers.dev/tg`  
- `TGID`：通过Telegram关注 [@XiaoGuiDangJia_ID_BOT](https://t.me/XiaoGuiDangJia_ID_BOT) 获取  
- `TGTOKEN`：通过 [@BotFather](https://t.me/BotFather) 申请新机器人获取  

---

### 👋 手动签到（验证是否成功）
示例机场密码: `password`  
访问：  
`https://jeffern.workers.dev/password`  
查看Worker返回的信息。

---

### ⏰ 设置自动签到
1. 前往 Cloudflare Workers 控制台  
2. 进入 **设置 > 触发事件 > +添加 > Cron 触发器**  
3. 选择 **每天** 和 **00:00**（建议根据需求调整时间）  
4. 点击 **添加** 完成设置  

⚠️ **注意时区**  
Cloudflare 使用 UTC 时间（北京时间 = UTC +8）！

---

## 📋 环境变量配置

| 变量名       | 示例值                      | 必填 | 备注                          |
|--------------|----------------------------|------|-------------------------------|
| `JC`  | `ikuuu.one`                | ✅   | 机场域名                      |
| `ZH`    | `jeffern@google.com`       | ✅   | 机场账户邮箱                  |
| `MM`    | `password`                 | ✅   | 机场账户密码                  |
| `TGID`       | `6666666666`               | ❌   | 接收通知的Telegram账户ID      |
| `TGTOKEN`    | `6666666666:XXXX...`       | ❌   | Telegram机器人Token           |

---

## 📊 脚本执行示例
![返回数据示例](https://github.com/user-attachments/assets/858f1ed3-53b3-4de4-9770-fbbdb82afd8b)
![IMG_8686](https://github.com/user-attachments/assets/52b736bf-7753-4dd2-9579-dbf927a253a0)


> 注：部分机场可能不返回流量字段，识别不到会显示"未知"（不影响使用）。如需修改发送给机器人的字段，请调整代码中的`checkin`部分。

---

## 🔧 其他项目
如果机场不支持网页API签到，可尝试以下项目，通过Python脚本自动签到telegram机器人：  
[Telegram-bot-auto-checkin](https://github.com/jeffernn/Telegram-bot-auto-checkin)

---

## ⚠️ 警告
**使用本脚本可能导致因API滥用触发封号规则，后果自负**  
如果你觉得本项目对你有帮助，请点一个Star🌟
本项目由Jeffern维护
本项目仅供教学使用，请下载后24小时内删除。
