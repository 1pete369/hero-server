import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax.js"
dayjs.extend(minMax)

import Goal from "../models/goal.model.js"

export const calculateExpectedCompletions = (habit, goalTargetDate) => {
  // Use the later of habit start date or goal start date (if goal has one)
  const habitStart = dayjs(habit.startDate).startOf("day")
  const goalStart = dayjs(goalTargetDate).startOf("day") // We'll use goal target date as reference
  const start = habitStart
  const end = dayjs(goalTargetDate).startOf("day")

  let count = 0

  if (habit.frequency === "daily") {
    // For daily habits, count all days from start to end (inclusive)
    count = end.diff(start, "day") + 1
  } else if (habit.frequency === "weekly") {
    // For weekly habits, only count days that match the specified days
    let temp = start
    while (temp.isBefore(end) || temp.isSame(end, "day")) {
      if (habit.days.includes(temp.format("dddd"))) {
        count++
      }
      temp = temp.add(1, "day")
    }
  }

  console.log(`Habit "${habit.title}": Start=${start.format('YYYY-MM-DD')}, End=${end.format('YYYY-MM-DD')}, Expected=${count}`)
  return count
}

export const updateGoalProgress = async (goalId) => {
  const goal = await Goal.findById(goalId).populate("linkedHabits")
  if (!goal) return

  let totalExpected = 0
  let totalDone = 0

  console.log(`\n=== Calculating progress for goal: "${goal.title}" ===`)
  console.log(`Goal target date: ${dayjs(goal.targetDate).format('YYYY-MM-DD')}`)

  for (const habit of goal.linkedHabits) {
    const expected = calculateExpectedCompletions(habit, goal.targetDate)
    const actual = habit.completedDates.length
    totalExpected += expected
    totalDone += actual
    
    console.log(`Habit "${habit.title}": Expected=${expected}, Actual=${actual}, Rate=${expected > 0 ? Math.round((actual/expected) * 100) : 0}%`)
  }

  const progress = totalExpected > 0 ? Math.min(100, Math.round((totalDone / totalExpected) * 100)) : 0
  console.log(`Total: Expected=${totalExpected}, Actual=${totalDone}, Progress=${progress}%`)
  console.log(`=== End calculation ===\n`)

  goal.progress = progress
  await goal.save()
}


