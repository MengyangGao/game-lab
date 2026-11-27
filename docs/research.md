# 玩法研究与选型

优先评估能否从短局中获得清楚的目标和反馈、能否撤销、能否验证解，以及鼠标和触屏下是否容易操作。公开资料用于核对机制，棋盘、关卡种子、文字、图形及程序均在本项目独立编写。

| 参考机制 | 资料里观察到的玩法 | 本项目决策 |
| --- | --- | --- |
| 匣里流光 | 调整光束发射、反射路径，照射指定目标 | 匣里流光采用持续照射、固定发射端、可翻转镜面、感光器与接收器。 |
| 溢彩画 | 为同色连通区域换色，并合并相邻颜色块 | 任选同色区域换色，合并相邻同色区域，在限步内涂成目标色。 [玩法说明](https://wuthering.gg/zh-Hans/guide/adventure/overflowing-palette) [换色实机](https://www.youtube.com/watch?v=BiFah4QHR4o) |
| 庸人的容器 | 把挡路的箱子推开，从可进入的一侧救出被困目标 | 庸人的容器保留推而不可拉、开辟营救路线，用抽象的星形终点表示救援点。 |
| 枘凿六合及 Remake | 原版以旋转匹配目标轮廓；Remake 要补充方块并吻合投影 | 枘凿六合·Remake采用逐层填充、固定锚块、三个可实时校准的投影。 |
| 梦境拼图 | 将散落画片组合成完整画面 | 梦境拼图采用自绘装饰画，可交换或旋转图块。 |
| 黄金替罪羊 | 已执行的指令会由过去的自己重演，必须安排两者的位置和时机 | 记录开局的一段动作，由回声逐步回放，回放结束后停在当前格。玩家需在回声踩住开关时抵达出口。 [实机攻略](https://www.youtube.com/watch?v=336CMN7hcX4) |

- 崩铁玩法核对覆盖工造司光路、庙趣满堂、庸人的容器、匹诺康尼与黄金替罪羊。活动视频同页也展示大衍万象的图案复位和码放货物，可分别进一步抽象成位置置换、装箱约束。《寻径指津》的批量指令和梦境迷钟的移动、旋转、镜像路径也适合单独设计。差分宇宙实机展示罗盘、限时躲避、捕捉与打罐子，本轮选用无计时的逻辑玩法。 [匣里流光攻略](https://www.hoyolab.com/article/18738699) [庙趣满堂实机](https://www.bilibili.com/video/BV1UBxpeiEUR/) [庸人的容器攻略](https://www.taptap.cn/moment/401803766359130582) [匹诺康尼实机](https://www.youtube.com/watch?v=T3AB6qWPf8s) [黄金替罪羊实机](https://www.youtube.com/watch?v=336CMN7hcX4) [差分宇宙实机](https://www.bilibili.com/video/BV1VLghe8Ehm/)
- 鸣潮的配色连通和能量矩阵可独立成局。电池门禁重在携带、配色、开门顺序，信号终端是配对连线，约束与画布染色不同。当前优先配色，信号走线可单独扩展。 [溢彩画实机](https://www.bilibili.com/video/BV1jFZGYyEF1/) [电池攻略](https://www.gamersky.com/handbook/202405/1750236_16.shtml) [信号与探索攻略](https://wutheringwaves.gg/exploration-guide/) [能量矩阵实机](https://www.youtube.com/watch?v=JMsHt-eMHug)
- 原神重点比较稻妻立方体、继电石、海灯节纸映成戏。立方体的邻接联动适合抽象，实体搬运场景中的继电石可保留为独立连通设计，纸映成戏适合未来的格块换位与自动移动玩法。熄灯取联动的思考逻辑，判定规则采用经典 Lights Out。 [稻妻攻略](https://www.hoyolab.com/article/18986285) [继电石实机](https://www.youtube.com/watch?v=Vsjs77FwXMg) [海灯节玩法说明](https://www.hoyolab.com/article/15219199)
- 社区讨论中，崩铁玩家反复提及光路、寻径、原版六合和梦境迷钟；稻妻玩家对立方体及继电石有不同评价。有人喜欢推理，也有人觉得试错不透明。实现优先做即时响应、每一步可撤销和可选的分层提示。 [崩铁玩家讨论](https://www.reddit.com/r/HonkaiStarRail/comments/1fvo0ra/) [稻妻玩家讨论](https://www.reddit.com/r/GenshinImpact/comments/16omn76/) [玩家访谈附录](https://uu.diva-portal.org/smash/get/diva2%3A1765941/FULLTEXT01.pdf)
- 比较过可公开使用或查看的实例。Simon Tatham 合集（MIT）可比较 Flood、Flip 与跨平台合集的做法；GitHub 上的 Lights Out Solver 可比较约束求解；溢彩画在线项目展示题库和自动解答；itch.io 有六合同人和独立光路作品。项目没有复制这些实现的代码或资源。 [Tatham 源码与许可证](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/) [Lights Out Solver](https://github.com/PrinceOfBorgo/lights-out) [溢彩画在线参考](https://yicai.gantrol.com/) [六合同人](https://onixcodegreen.itch.io/hexanexus-is-fun) [Lasers And Mirrors](https://titimoby.itch.io/lasers-and-mirrors)
