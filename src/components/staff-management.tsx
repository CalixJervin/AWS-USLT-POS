import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Staff } from "@/hooks/use-auth"
import type { Role } from "@/hooks/use-auth"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, UserPlus, ShieldAlert, Coffee, Edit2 } from "lucide-react"
import { toast } from "sonner"

export function StaffManagement() {
  const { staffList, addStaff, deleteStaff, updateStaff, user: currentUser } = useAuth()
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null)
  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null)
  
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<Role>("cashier")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [newCanManageMenu, setNewCanManageMenu] = useState(false)
  const [newCanManageInventory, setNewCanManageInventory] = useState(false)

  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState<Role>("cashier")
  const [editPin, setEditPin] = useState("")
  const [editConfirmPin, setEditConfirmPin] = useState("")
  const [editCanManageMenu, setEditCanManageMenu] = useState(false)
  const [editCanManageInventory, setEditCanManageInventory] = useState(false)

  const handleAddAccount = async () => {
    if (!newName.trim()) return toast.error("Name is required")
    if (newPin.length < 4) return toast.error("PIN must be at least 4 digits")
    if (newPin !== confirmPin) return toast.error("PINs do not match")

    const result = await addStaff({
      name: newName.trim(),
      role: newRole,
      avatarColor: "bg-primary",
      canManageMenu: newRole === "admin" ? true : newCanManageMenu,
      canManageInventory: newRole === "admin" ? true : newCanManageInventory
    }, newPin)

    if (result.success) {
      toast.success(result.message)
      setNewName("")
      setNewPin("")
      setConfirmPin("")
      setNewCanManageMenu(false)
      setNewCanManageInventory(false)
      setIsAddDialogOpen(false)
    } else {
      toast.error(result.message)
    }
  }

  const handleEditClick = (staff: Staff) => {
    setStaffToEdit(staff)
    setEditName(staff.name)
    setEditRole(staff.role)
    setEditCanManageMenu(staff.canManageMenu || false)
    setEditCanManageInventory(staff.canManageInventory || false)
    setEditPin("")
    setEditConfirmPin("")
    setIsEditDialogOpen(true)
  }

  const handleUpdateAccount = async () => {
    if (!staffToEdit) return
    if (!editName.trim()) return toast.error("Name is required")
    
    if (editPin) {
      if (editPin.length < 4) return toast.error("PIN must be at least 4 digits")
      if (editPin !== editConfirmPin) return toast.error("PINs do not match")
    }

    const result = await updateStaff(staffToEdit.id, {
      name: editName.trim(),
      role: editRole,
      canManageMenu: editRole === "admin" ? true : editCanManageMenu,
      canManageInventory: editRole === "admin" ? true : editCanManageInventory
    }, editPin || undefined)

    if (result.success) {
      toast.success(result.message)
      setIsEditDialogOpen(false)
    } else {
      toast.error(result.message)
    }
  }

  const handleDeleteClick = (staff: Staff) => {
    if (staff.id === currentUser?.id) {
      return toast.error("You cannot delete your own account")
    }
    setStaffToDelete(staff)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (staffToDelete) {
      deleteStaff(staffToDelete.id)
      toast.success(`${staffToDelete.name} deleted`)
      setIsDeleteConfirmOpen(false)
      setStaffToDelete(null)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>Manage staff accounts and permissions</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Create a new staff member account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <Input 
                  placeholder="e.g. David" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newRole} onValueChange={(value: Role) => setNewRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRole === "cashier" && (
                <div className="grid gap-3 p-4 bg-muted/50 rounded-lg border">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Additional Permissions</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="new-manage-menu"
                        checked={newCanManageMenu}
                        onChange={(e) => setNewCanManageMenu(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="new-manage-menu" className="text-sm font-medium cursor-pointer">Access Menu Management</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="new-manage-inventory"
                        checked={newCanManageInventory}
                        onChange={(e) => setNewCanManageInventory(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="new-manage-inventory" className="text-sm font-medium cursor-pointer">Access Inventory</label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-sm font-medium">PIN (4-6 digits)</label>
                <Input 
                  type="password" 
                  inputMode="numeric"
                  placeholder="••••" 
                  value={newPin} 
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Confirm PIN</label>
                <Input 
                  type="password" 
                  inputMode="numeric"
                  placeholder="••••" 
                  value={confirmPin} 
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddAccount}>Save Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Last Shift Start</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffList.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {staff.avatarInitials}
                    </div>
                    {staff.name} {staff.id === currentUser?.id && "(You)"}
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  <div className="flex items-center gap-1">
                    {staff.role === 'admin' ? <ShieldAlert className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                    {staff.role}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {staff.role === 'admin' ? (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">All Access</span>
                    ) : (
                      <>
                        {staff.canManageMenu && <span className="bg-[#E8DFD3] text-[#6B5B4E] px-2 py-0.5 rounded text-[10px] font-bold uppercase">Menu</span>}
                        {staff.canManageInventory && <span className="bg-[#E8DFD3] text-[#6B5B4E] px-2 py-0.5 rounded text-[10px] font-bold uppercase">Inventory</span>}
                        {!staff.canManageMenu && !staff.canManageInventory && <span className="text-muted-foreground text-[10px] italic">POS Only</span>}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {staff.shiftStart ? new Date(staff.shiftStart).toLocaleString() : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditClick(staff)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(staff)}
                      disabled={staff.id === currentUser?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Update staff member information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <Input 
                  placeholder="e.g. David" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={editRole} onValueChange={(value: Role) => setEditRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRole === "cashier" && (
                <div className="grid gap-3 p-4 bg-muted/50 rounded-lg border">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Additional Permissions</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="edit-manage-menu"
                        checked={editCanManageMenu}
                        onChange={(e) => setEditCanManageMenu(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="edit-manage-menu" className="text-sm font-medium cursor-pointer">Access Menu Management</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="edit-manage-inventory"
                        checked={editCanManageInventory}
                        onChange={(e) => setEditCanManageInventory(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="edit-manage-inventory" className="text-sm font-medium cursor-pointer">Access Inventory</label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-sm font-medium">New PIN (Leave blank to keep current)</label>
                <Input 
                  type="password" 
                  inputMode="numeric"
                  placeholder="••••" 
                  value={editPin} 
                  onChange={(e) => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
              {editPin && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Confirm New PIN</label>
                  <Input 
                    type="password" 
                    inputMode="numeric"
                    placeholder="••••" 
                    value={editConfirmPin} 
                    onChange={(e) => setEditConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateAccount}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Staff Deletion</DialogTitle>
              <DialogDescription className="py-4">
                Are you sure you want to delete <strong>{staffToDelete?.name}</strong>? This action will permanently remove their access.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1">Delete Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
