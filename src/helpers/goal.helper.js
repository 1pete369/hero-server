import dayjs from "dayjs"
import minMax from "dayjs/plugin/minMax.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(minMax)
dayjs.extend(utc)

import Goal from "../models/goal.model.js"

export const calculateExpectedCompletions = (habit, goalTargetDate) => {
  // Use the later of habit start date or goal start date (if goal has one)
  const habitStart = dayjs.utc(habit.startDate).startOf("day")
  const goalStart = dayjs.utc(goalTargetDate).startOf("day") // reserved for future goal-start support
  const start = habitStart
  const end = dayjs.utc(goalTargetDate).startOf("day")

  if (start.isAfter(end)) {
    return 0
  }

  let count = 0

  if (habit.frequency === "daily") {
    // For daily habits, count all days from start to end (inclusive)
    count = end.diff(start, "day") + 1
  } else if (habit.frequency === "weekly") {
    // For weekly habits, only count days that match the specified days
    const abbrev = ["sun","mon","tue","wed","thu","fri","sat"]
    let temp = start
    while (temp.isBefore(end) || temp.isSame(end, "day")) {
      const dayKey = abbrev[temp.day()]
      if (Array.isArray(habit.days) && habit.days.includes(dayKey)) {
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
  console.log(`Goal target date: ${dayjs.utc(goal.targetDate).format('YYYY-MM-DD')}`)

  for (const habit of goal.linkedHabits) {
    const expected = calculateExpectedCompletions(habit, goal.targetDate)

    // Count only completions within [start, target] and on scheduled days if weekly
    const start = dayjs.utc(habit.startDate).startOf("day")
    const end = dayjs.utc(goal.targetDate).startOf("day")
    const inWindow = (d) => {
      const x = dayjs.utc(d).startOf("day")
      return (x.isAfter(start) || x.isSame(start, "day")) && (x.isBefore(end) || x.isSame(end, "day"))
    }
    let actual = 0
    const abbrev = ["sun","mon","tue","wed","thu","fri","sat"]
    for (const d of habit.completedDates || []) {
      if (!inWindow(d)) continue
      if (habit.frequency === "weekly") {
        const key = abbrev[dayjs.utc(d).day()]
        if (Array.isArray(habit.days) && habit.days.includes(key)) actual += 1
      } else if (habit.frequency === "daily") {
        actual += 1
      } else {
        // Fallback: count it
        actual += 1
      }
    }
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


