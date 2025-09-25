import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax.js"
dayjs.extend(minMax)

import Goal from "../models/goal.model.js"

export const calculateExpectedCompletions = (habit, goalTargetDate) => {
  const start = dayjs.max(
    dayjs(habit.startDate).startOf("day"),
    dayjs(habit.createdAt).startOf("day")
  )
  const end = dayjs(goalTargetDate).startOf("day")

  let count = 0

  if (habit.frequency === "daily") {
    count = end.diff(start, "day") + 1
  } else if (habit.frequency === "weekly") {
    let temp = start
    while (temp.isBefore(end) || temp.isSame(end, "day")) {
      if (habit.days.includes(temp.format("dddd"))) {
        count++
      }
      temp = temp.add(1, "day")
    }
  }

  return count
}

export const updateGoalProgress = async (goalId) => {
  const goal = await Goal.findById(goalId).populate("linkedHabits")
  if (!goal) return

  let totalExpected = 0
  let totalDone = 0

  for (const habit of goal.linkedHabits) {
    const expected = calculateExpectedCompletions(habit, goal.targetDate)
    totalExpected += expected
    totalDone += habit.completedDates.length
  }

  goal.progress = totalExpected > 0 ? Math.min(100, Math.round((totalDone / totalExpected) * 100)) : 0
  await goal.save()
}


