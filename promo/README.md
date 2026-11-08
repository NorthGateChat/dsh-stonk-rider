# Stonk Rider 宣传片

成片：[stonk-rider-launch.mp4](stonk-rider-launch.mp4)（40 秒 / 1920×1080 / 30fps）
封面：[stonk-rider-launch-poster.jpg](stonk-rider-launch-poster.jpg)

## 结构

| 时间 | 内容 |
| --- | --- |
| 0–3s | 冷开场：这 40 秒，骑上一条真实 K 线 |
| 3–9s | 真实行情、直接开骑 |
| 9–15s | 做多/做空、加仓、平仓 |
| 15–21s | 骑行暂停，向 DSH 复盘 |
| 21–27s | 每局结算 / 休整室 + 本回合逐笔交易 |
| 27–30.5s | 赢家滚存：本金和 Build 进入第 4/8 回合 |
| 30.5–37s | 骑行途中重仓押反、资金归零、摔车、赛程终止 |
| 37–40s | 片尾安装卡 |

## 重新生成

依赖 Chrome、ffmpeg、Node.js：

```powershell
node promo/build-page.mjs                         # 生成 promo/host.html
node promo/capture.mjs --seconds=40200            # 按时间线录制 promo/frames/
node promo/make-audio.mjs                         # 生成 promo/audio.wav
node promo/encode.mjs                             # 输出成片和封面所需的视频
```

`capture.mjs` 使用 Chrome DevTools Protocol 对真实游戏 iframe 做 screencast，时间线在 `promo/page.template.html` 的 `startPromo()` 中；结算、滚存、途中爆仓都通过游戏自身的休整室、首页赛程卡和破产路径触发。

BGM：《Kick Shock》— Kevin MacLeod，CC BY 4.0。
