本脚本适用于使用SSPANEL搭建的机场，因为API地址使用的都是一样的，其他模版搭建的可以参考此方法，只需要修改以下登陆和签到API地址即可实现自动签到；
⚠️：cloudflare的worker被墙，首次测试需代理，后期无需，若使用cloudflare的代理请换其他代理，因为cloudflare无法给cloudflare自身代理

🚀 使用方法：
项目案例地址: jeffern.workers.dev

🔔 检查 TG 通知是否成功
访问 https://jeffern.workers.dev/tg
其中的TGID可以打开Telegram，关注@XiaoGuiDangJia_ID_BOT机器人获取
其中TGTOKEN关注@BotFather机器人申请新的机器人获取

👋 手动签到（验证是否签到成功）
示例机场密码: password
访问 https://jeffern.workers.dev/password
查看worker返回的信息


⏰ 设置自动签到
前往 设置 > 触发事件 > +添加 > Cron 触发器
选择 每天 和 00:00（建议根据需求调整时间）
点击 添加 完成设置
⚠️Attation:
请注意，Cloudflare 使用的是 UTC 标准时间，与北京时间有 8 小时的时差！

📋 相关环境变量说明

变量名	      示例	                                必填	     备注
JC/DOMAIN	 ikuuu.one       	                     ✅	    机场域名
ZH/USER	   jeffern@google.com	                   ✅	    机场账户邮箱
MM/PASS   	password            	               ✅	    机场账户密码
TGID	     6946912345                           ❌ 接收 TG 通知的账户数字 ID
TGTOKEN	6894123456:XXXXXXXXXX0qExVsBPUhHDAbXXX	 ❌	发送 TG 通知的机器人 token
 👋脚本执行返回的数据
 <img width="1058" alt="image" src="https://github.com/user-attachments/assets/858f1ed3-53b3-4de4-9770-fbbdb82afd8b" />
机场签到后可能不会返回一些流量的相关字段，不过没关系，识别不到默认改为未知，需要增加或删除字段可以看代码中checkin部分，有些机场不支持网页的api签到可以移步到本人仓库的另外一个项目
项目地址：https://github.com/jeffernn/Telegram-bot-auto-checkin
