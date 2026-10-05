# 赛事处罚

处罚文件为可选文件，存放在 `series/<slug>/penalties/<roundId>.json`。原始 `series/<slug>/eventresult-*.json` 文件保持不变。

每个处罚文件包含一个 `penalties` 数组。车手通过 iRacing 的 `cust_id` 标识，在处罚文件中以字符串形式填写：

```json
{
  "penalties": [
    {
      "type": "time",
      "driverId": "123456",
      "seconds": 5,
      "reason": "赛后加罚"
    },
    {
      "type": "position",
      "driverId": "123456",
      "positions": 2,
      "reason": "Causing a collision"
    },
    {
      "type": "points",
      "driverId": "234567",
      "points": 5,
      "reason": "Post-race penalty"
    },
    {
      "type": "disqualification",
      "driverId": "345678",
      "reason": "Technical infringement"
    }
  ]
}
```

字段含义：

- `time`：加罚 `seconds` 秒，须为有限正数，可填小数。同一车手的多条罚时累加；按完成圈数从多到少、同圈调整后用时从短到长重算正式名次及差距，相同用时保留原始顺序。
- `position`：车手在正式成绩中后退 `positions` 个名次，然后再计算积分。
- `points`：从该轮的锦标赛积分中扣除 `points` 分。
- `disqualification`：取消该轮比赛资格；该车手排在已分类车手之后，且该轮获得零积分，包括杆位和最快圈奖励积分。
- `reason`：可选的处罚原因，建议只填写违规事实，避免重复填写已由类型和数值展示的处罚结果。示例中的英文原因仅为演示；页面会原样显示文件中填写的文字。

处理顺序为取消资格 → 累加罚时并排序 → 按文件顺序应用名次后退 → 计算积分和奖励。取消资格车手的罚时不再生效；没有有效完赛名次的车手不能应用罚时，缺少有效时间时构建会报错。原始完赛名次保留，正式名次用于积分、依赖名次的奖励及证书。

同圈用时优先由原领先者用时加原始 `interval` 还原，其他车手使用 `average_lap × laps_complete`；内部保留数值精度，展示到毫秒。有罚时的比赛在最终排序后更新与正式领先者的差距；落后圈数显示圈差。若同时有名次后退，正式名次可能不再按用时排列，此时时间差可能为负数（或显示领先圈数）。
