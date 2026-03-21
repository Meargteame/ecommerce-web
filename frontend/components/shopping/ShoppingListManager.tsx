'use client'

import { useState } from 'react'
import { useShoppingListStore } from '@/store/shoppingListStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { List, Plus, Share2, Lock, Trash2, Edit2 } from 'lucide-react'

interface ShoppingListManagerProps {
  productId?: string
  variantId?: string
  trigger?: React.ReactNode
}

export function ShoppingListManager({ productId, variantId, trigger }: ShoppingListManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  const { lists, loading, createList, addItem, fetchLists } = useShoppingListStore()

  const handleOpen = async () => {
    setIsOpen(true)
    await fetchLists()
  }

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    
    await createList({
      name: newListName,
      description: newListDescription,
      isPublic
    })
    
    setNewListName('')
    setNewListDescription('')
    setIsPublic(false)
    setIsCreateOpen(false)
  }

  const handleAddToList = async (listId: string) => {
    if (productId) {
      await addItem(listId, {
        productId,
        variantId,
        quantity: 1
      })
      setIsOpen(false)
    }
  }

  const handleAddToNewList = async () => {
    if (!newListName.trim() || !productId) return
    
    await createList({
      name: newListName,
      description: newListDescription,
      isPublic
    })
    
    // The new list will be at the top (sorted by created_at)
    const newList = useShoppingListStore.getState().lists[0]
    if (newList) {
      await addItem(newList.id, {
        productId,
        variantId,
        quantity: 1
      })
    }
    
    setIsOpen(false)
    setNewListName('')
    setNewListDescription('')
    setIsPublic(false)
  }

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleOpen}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          Save to List
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save to Shopping List</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {productId && (
              <div className="space-y-2">
                <h4 className="font-medium">Select a list or create new:</h4>
                
                {lists.length === 0 && !isCreateOpen && (
                  <div className="text-sm text-gray-500">
                    You don't have any shopping lists yet.
                  </div>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => handleAddToList(list.id)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {list.name}
                          {list.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {list.item_count} items
                        </div>
                      </div>
                      {list.is_public ? (
                        <Share2 className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>

                {!isCreateOpen ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(true)}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New List
                  </Button>
                ) : (
                  <div className="space-y-3 border rounded-lg p-4">
                    <div className="space-y-2">
                      <Label htmlFor="list-name">List Name *</Label>
                      <Input
                        id="list-name"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="e.g., Birthday Gifts"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="list-description">Description (optional)</Label>
                      <Input
                        id="list-description"
                        value={newListDescription}
                        onChange={(e) => setNewListDescription(e.target.value)}
                        placeholder="What's this list for?"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is-public"
                        checked={isPublic}
                        onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                      />
                      <Label htmlFor="is-public" className="text-sm cursor-pointer">
                        Make this list public (shareable)
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={productId ? handleAddToNewList : handleCreateList}
                        disabled={!newListName.trim() || loading}
                        className="flex-1"
                      >
                        {loading ? 'Creating...' : (productId ? 'Create & Add' : 'Create')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ShoppingListCard({ list }: { list: import('@/store/shoppingListStore').ShoppingList }) {
  const { deleteList, updateList } = useShoppingListStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(list.name)

  const handleSave = async () => {
    await updateList(list.id, { name: editName })
    setIsEditing(false)
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8"
              />
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{list.name}</h3>
              {list.is_default && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
          )}
          
          <p className="text-sm text-gray-500 mt-1">
            {list.item_count} items
          </p>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {!list.is_default && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteList(list.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {list.preview_items && list.preview_items.length > 0 && (
        <div className="flex gap-2 mt-3">
          {list.preview_items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <List className="h-4 w-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {list.is_public && list.share_token && (
        <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
          <Share2 className="h-3 w-3" />
          Shareable link available
        </div>
      )}
    </div>
  )
}
