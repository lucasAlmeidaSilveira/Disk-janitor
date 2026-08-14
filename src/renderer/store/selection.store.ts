import { create } from 'zustand'

type SelectionState = {
  selection: Record<string, Set<string>>
  toggle: (categoryId: string, itemId: string) => void
  setAll: (categoryId: string, itemIds: string[]) => void
  clear: (categoryId: string) => void
  isSelected: (categoryId: string, itemId: string) => boolean
  selectedIds: (categoryId: string) => string[]
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selection: {},

  toggle: (categoryId, itemId) => {
    const current = new Set(get().selection[categoryId] ?? [])
    if (current.has(itemId)) current.delete(itemId)
    else current.add(itemId)
    set({ selection: { ...get().selection, [categoryId]: current } })
  },

  setAll: (categoryId, itemIds) => {
    set({ selection: { ...get().selection, [categoryId]: new Set(itemIds) } })
  },

  clear: (categoryId) => {
    const next = { ...get().selection }
    delete next[categoryId]
    set({ selection: next })
  },

  isSelected: (categoryId, itemId) => {
    return get().selection[categoryId]?.has(itemId) ?? false
  },

  selectedIds: (categoryId) => {
    return Array.from(get().selection[categoryId] ?? [])
  },
}))
