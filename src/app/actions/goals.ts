"use server"

import { ObjectId } from "mongodb"
import { collections } from "@/lib/db"
import { requireUserForMutation } from "@/lib/auth/dal"
import { isDate } from "@/lib/dates"
import { goalBalance } from "@/lib/domain/snapshot"
import {
  ActionError,
  assertRecordUnlocked,
  assertWritableDate,
  requireAmount,
  requireId,
  requireStr,
  runAction,
  setOrUnset,
  str,
} from "@/lib/actions/helpers"
import type { ActionState, ContributionDirection } from "@/lib/types"

function readGoalFields(form: FormData) {
  const name = requireStr(form, "name", "Name", 60)
  const target = requireAmount(form, "target", "Target")
  const targetDate = str(form, "targetDate") || undefined
  if (targetDate && !isDate(targetDate)) throw new ActionError("Enter a valid target date.", "targetDate")
  return { name, target, targetDate }
}

export async function createGoalAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const { name, target, targetDate } = readGoalFields(form)
    const { goals } = await collections()
    await goals.insertOne({
      _id: new ObjectId(),
      userId: user._id,
      name,
      target,
      ...(targetDate ? { targetDate } : {}),
      archived: false,
    })
  })
}

export async function updateGoalAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Goal")
    const fields = readGoalFields(form)
    const { goals } = await collections()
    const result = await goals.updateOne({ _id: id, userId: user._id }, setOrUnset(fields))
    if (result.matchedCount === 0) throw new ActionError("Goal not found.")
  })
}

export async function setGoalArchivedAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Goal")
    const archived = str(form, "archived") === "true"
    const { goals } = await collections()
    const result = await goals.updateOne({ _id: id, userId: user._id }, { $set: { archived } })
    if (result.matchedCount === 0) throw new ActionError("Goal not found.")
  })
}

/** Delete only if the goal has no contributions. */
export async function deleteGoalAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Goal")
    const { goals, contributions } = await collections()
    const any = await contributions.findOne({ userId: user._id, goalId: id }, { projection: { _id: 1 } })
    if (any) throw new ActionError("This goal has contributions. Archive it instead.")
    const result = await goals.deleteOne({ _id: id, userId: user._id })
    if (result.deletedCount === 0) throw new ActionError("Goal not found.")
  })
}

async function balanceOf(userId: ObjectId, goalId: ObjectId, excludeId?: ObjectId) {
  const { contributions } = await collections()
  const docs = await contributions
    .find({ userId, goalId, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }, { projection: { direction: 1, amount: 1 } })
    .toArray()
  return goalBalance(docs)
}

export async function addContributionAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const goalId = requireId(form, "goalId", "Goal")
    const direction = str(form, "direction") as ContributionDirection
    if (direction !== "deposit" && direction !== "withdraw") throw new ActionError("Choose deposit or withdraw.", "direction")
    const amount = requireAmount(form)
    const date = str(form, "date")
    assertWritableDate(date, user.today)

    const { goals, contributions } = await collections()
    const goal = await goals.findOne({ _id: goalId, userId: user._id })
    if (!goal) throw new ActionError("Goal not found.")
    if (direction === "withdraw") {
      const balance = await balanceOf(user._id, goalId)
      if (amount > balance) throw new ActionError("You can't withdraw more than the goal holds.", "amount")
    }
    await contributions.insertOne({ _id: new ObjectId(), userId: user._id, goalId, direction, amount, date })
  })
}

export async function deleteContributionAction(_: ActionState, form: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUserForMutation()
    const id = requireId(form, "id", "Contribution")
    const { contributions } = await collections()
    const existing = await contributions.findOne({ _id: id, userId: user._id })
    if (!existing) throw new ActionError("Contribution not found.")
    assertRecordUnlocked(existing.date, user.today)
    if (existing.direction === "deposit" && (await balanceOf(user._id, existing.goalId, id)) < 0) {
      throw new ActionError("Removing this deposit would take the goal below zero.")
    }
    await contributions.deleteOne({ _id: id, userId: user._id })
  })
}
