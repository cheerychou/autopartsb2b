# B1-RU 定时调度（D1-B，2026-10-26）

当前仅一项：**F-11 限时价到期批量下价**（`manage.py deactivate_expired_prices`，
幂等可重入）。建议周期 5–15 分钟。

## 方式一（优先）：systemd timer

```bash
sudo cp b1ru-pricing-expiry.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now b1ru-pricing-expiry.timer
systemctl list-timers | grep b1ru        # 验证
journalctl -u b1ru-pricing-expiry.service # 查看执行日志
```

## 方式二（备选）：cron

```bash
crontab -e   # 粘贴 crontab.example 内容，路径按实际调整
```

## 回退（D1-A）

客户环境禁用 cron/timer 时无需任何配置：管理端手动位
`POST /api/v1/pricing/deactivate-expired/`（products:write）+ 买家侧读路径防御
（过期不下发价格、不可成交）照常兜底——宁可少卖，不漏价。

## 与断网自足的关系

cron/timer 为宿主机本地机制，不引入外联与常驻应用服务（铁律 3 不受影响）。
勿在此调度位接入任何在线依赖；未来新增调度项须先过委托方批准（部署形态变更）。
