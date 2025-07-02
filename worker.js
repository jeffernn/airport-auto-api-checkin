let domain = "这里填机场域名";
let user = "这里填邮箱";
let pass = "这里填密码";
let 签到结果;
let BotToken ='';
let ChatID =''; 

export default {
	// HTTP 请求处理函数保持不变
	async fetch(request, env, ctx) {
		await initializeVariables(env);
		const url = new URL(request.url);
		if(url.pathname == "/tg") {
			await sendMessage();
		} else if (url.pathname == `/${pass}`){
			await checkin();
		}
		return new Response(签到结果, {
			status: 200,
			headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
		});
	},

	// 定时任务处理函数
	async scheduled(controller, env, ctx) {
		console.log('Cron job started');
		try {
			await initializeVariables(env);
			await checkin();
			console.log('Cron job completed successfully');
		} catch (error) {
			console.error('Cron job failed:', error);
			签到结果 = `定时任务执行失败: ${error.message}`;
			await sendMessage(签到结果);
		}
	},
};

async function initializeVariables(env) {
	domain = env.JC || env.DOMAIN || domain;
	user = env.ZH || env.USER || user;
	pass = env.MM || env.PASS || pass;
	if(!domain.includes("//")) domain = `https://${domain}`;
	BotToken = env.TGTOKEN || BotToken;
	ChatID = env.TGID || ChatID;
	签到结果 = `地址: ${domain.substring(0, 9)}****${domain.substring(domain.length - 5)}\n账号: ${user.substring(0, 1)}****${user.substring(user.length - 5)}\n密码: ${pass.substring(0, 1)}****${pass.substring(pass.length - 1)}\n\nTG推送: ${ChatID ? `${ChatID.substring(0, 1)}****${ChatID.substring(ChatID.length - 3)}` : "未启用"}`;
}

async function sendMessage(msg = "") {
	const 账号信息 = `地址: ${domain}\n账号: ${user}\n密码: <tg-spoiler>${pass}</tg-spoiler>`;
	const now = new Date();
	const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
	const formattedTime = beijingTime.toISOString().slice(0, 19).replace('T', ' ');
	console.log(msg);
	if (BotToken !== '' && ChatID !== '') {
		const url = `https://api.telegram.org/bot${BotToken}/sendMessage?chat_id=${ChatID}&parse_mode=HTML&text=${encodeURIComponent("执行时间: " + formattedTime + "\n" + 账号信息 + "\n\n" + msg)}`;
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	} else if (ChatID !== "") {
		const url = `https://api.tg.090227.xyz/sendMessage?chat_id=${ChatID}&parse_mode=HTML&text=${encodeURIComponent("执行时间: " + formattedTime + "\n" + 账号信息 + "\n\n" + msg)}`;
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

// checkin 函数修改
async function checkin() {
	try {
		if (!domain || !user || !pass) {
			throw new Error('必需的配置参数缺失');
		}

		// 登录请求（保持不变）
		const loginResponse = await fetch(`${domain}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
				'Accept': 'application/json, text/plain, */*',
				'Origin': domain,
				'Referer': `${domain}/auth/login`,
			},
			body: JSON.stringify({
				email: user,
				passwd: pass,
				remember_me: 'on',
				code: "",
			}),
		});

		console.log('Login Response Status:', loginResponse.status);
		
		if (!loginResponse.ok) {
			const errorText = await loginResponse.text();
			throw new Error(`登录请求失败: ${errorText}`);
		}

		const loginJson = await loginResponse.json();
		console.log('Login Response:', loginJson);

		if (loginJson.ret !== 1) {
			throw new Error(`登录失败: ${loginJson.msg || '未知错误'}`);
		}

		// 获取 Cookie（保持不变）
		const cookieHeader = loginResponse.headers.get('set-cookie');
		if (!cookieHeader) {
			throw new Error('登录成功但未收到Cookie');
		}

		console.log('Received cookies:', cookieHeader);
		const cookies = cookieHeader.split(',').map(cookie => cookie.split(';')[0]).join('; ');

		// 等待确保登录状态（保持不变）
		await new Promise(resolve => setTimeout(resolve, 1000));

		// 签到请求（保持不变）
		const checkinResponse = await fetch(`${domain}/user/checkin`, {
			method: 'POST',
			headers: {
				'Cookie': cookies,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json',
				'Origin': domain,
				'Referer': `${domain}/user/panel`,
				'X-Requested-With': 'XMLHttpRequest'
			},
		});

		console.log('Checkin Response Status:', checkinResponse.status);

		const responseText = await checkinResponse.text();
		console.log('Checkin Raw Response:', responseText);

		// 修改部分：解析并提取流量信息
		try {
			const checkinResult = JSON.parse(responseText);
			console.log('Checkin Result:', checkinResult);
			
			// 基本签到消息
			let msg = checkinResult.msg || (checkinResult.ret === 1 ? '签到成功' : '签到失败');
			let trafficInfo = '';

			// 检查并提取流量信息
			if (checkinResult.trafficInfo) {
				const todayUsed = checkinResult.trafficInfo.todayUsedTraffic || '未知';
				const lastUsed = checkinResult.trafficInfo.lastUsedTraffic || '未知';
				const unUsed = checkinResult.trafficInfo.unUsedTraffic || '未知';
				trafficInfo = `\n\n今日使用流量: ${todayUsed}\n过去使用流量: ${lastUsed}\n剩余流量: ${unUsed}`;
			} else {
				trafficInfo = '\n\n流量信息不可用';
			}

			// 组合签到结果
			签到结果 = `🎉 签到结果 🎉\n ${msg}${trafficInfo}`;
		} catch (e) {
			if (responseText.includes('登录')) {
				throw new Error('登录状态无效，请检查Cookie处理');
			}
			throw new Error(`解析签到响应失败: ${e.message}\n\n原始响应: ${responseText}`);
		}

		await sendMessage(签到结果);
		return 签到结果;

	} catch (error) {
		console.error('Checkin Error:', error);
		签到结果 = `签到过程发生错误: ${error.message}`;
		await sendMessage(签到结果);
		return 签到结果;
	}
}
