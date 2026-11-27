# Puzzle Lab · 谜题实验室

Puzzle Lab 是一个纯静态、中文优先的原创休闲益智合集。七个小游戏，各有九道固定关卡和三个难度的随机模式。所有固定关卡随时可选。本地记录固定关卡最佳步数、各关进度和设置。

| 实验室 | 核心玩法 | 机制参考 |
| --- | --- | --- |
| 折光室 | 转动镜面，点亮沿途感光器并照亮终点 | 公输师傅的匣里流光 |
| 染色岛 | 合并同色区域，染满整张棋盘 | 鸣潮溢彩画、经典 Flood |
| 方箱营救 | 推开障碍箱，走到营救点 | 庸人的容器、愚者之箱 |
| 三面剪影 | 填充体素使三面投影吻合 | 枘凿六合 Remake |
| 梦片画廊 | 换位并旋转打散的原创画片 | 梦境拼图 |
| 回声倒影 | 规划脚步，让延迟回放的同伴踩中开关 | 黄金替罪羊 |
| 静电阵 | 翻转灯与四邻，让整块棋盘熄灭 | 经典 Lights Out、稻妻联动机关 |

## 本地运行

在项目根目录运行：

```sh
python3 -m http.server 8174 --bind 127.0.0.1 --directory public
```

打开 <http://127.0.0.1:8174/>。鼠标与触屏直接操作控件。键盘可用 Tab 和 Enter，移动游戏还支持方向键，回声倒影可用等待按钮。帮助分为策略、标出位置、执行一步。最佳步数包含执行提示的动作。

首次在线加载成功后，应用将静态文件保存到本地。页脚出现「可离线游玩」后，可断网重新进入。安装入口由浏览器提供，需使用 localhost 或 HTTPS。进度保存在当前浏览器和站点地址下。

## 验证与部署

```sh
npm test                       # Node.js 22 或更新版
gjs -m tests/engines.test.js    # 或使用 GNOME JavaScript
gjs -m tests/app-smoke.test.js
```

浏览器测试需另装 Playwright。在另一个终端运行本地服务后执行：

```sh
python -m pip install playwright
python -m playwright install chromium
PUZZLE_LAB_SCREENSHOTS=screenshots python tests/browser.py
```

直接把 `public/` 内容部署至任意 HTTPS 静态站点，支持子目录部署。应用没有运行时依赖、构建步骤或后端。GitHub Actions 工作流会运行引擎测试与 Chromium 端到端检查。

- [玩法调研与取舍](docs/research.md)
- [开发文档](docs/development.md)
