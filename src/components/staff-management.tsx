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
      avatarColor: "bg-[#00F2FE]",
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
    <Card className="w-full bg-[#1E2333] border-[#2D3448] shadow-[0_4px_16px_rgba(0,0,0,0.2)] text-[#E2E8F0]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-[#E2E8F0] font-bold text-lg">Staff Management</CardTitle>
          <CardDescription className="text-[#94A3B8]">Manage staff accounts and permissions</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black rounded-full px-4 shadow-md">
              <UserPlus className="mr-2 h-4 w-4 text-[#0B0E14]" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
            <DialogHeader>
              <DialogTitle className="text-[#E2E8F0] text-lg font-bold">Add New Account</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">
                Create a new staff member account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                <Input 
                  placeholder="e.g. David" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Role</label>
                <Select value={newRole} onValueChange={(value: Role) => setNewRole(value)}>
                  <SelectTrigger className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRole === "cashier" && (
                <div className="grid gap-3 p-4 bg-[#131824] rounded-lg border border-[#232A3B]">
                  <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider">Additional Permissions</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="new-manage-menu"
                        checked={newCanManageMenu}
                        onChange={(e) => setNewCanManageMenu(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#00F2FE]"
                      />
                      <label htmlFor="new-manage-menu" className="text-sm font-medium cursor-pointer text-[#E2E8F0]">Access Menu Management</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="new-manage-inventory"
                        checked={newCanManageInventory}
                        onChange={(e) => setNewCanManageInventory(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#00F2FE]"
                      />
                      <label htmlFor="new-manage-inventory" className="text-sm font-medium cursor-pointer text-[#E2E8F0]">Access Inventory</label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">PIN (4-6 digits)</label>
                <Input 
                  type="password" 
                  inputMode="numeric"
                  placeholder="••••" 
                  value={newPin} 
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Confirm PIN</label>
                <Input 
                  type="password" 
                  inputMode="numeric"
                  placeholder="••••" 
                  value={confirmPin} 
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-[#2D3448] text-[#94A3B8] hover:bg-[#282E42]" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black" onClick={handleAddAccount}>Save Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-[#2D3448] bg-[#131824]">
          <Table>
            <TableHeader className="bg-[#131824]">
              <TableRow className="border-b border-[#232A3B]">
                <TableHead className="text-[#94A3B8] font-bold text-xs uppercase">Name</TableHead>
                <TableHead className="text-[#94A3B8] font-bold text-xs uppercase">Role</TableHead>
                <TableHead className="text-[#94A3B8] font-bold text-xs uppercase">Permissions</TableHead>
                <TableHead className="text-[#94A3B8] font-bold text-xs uppercase">Last Shift Start</TableHead>
                <TableHead className="text-right text-[#94A3B8] font-bold text-xs uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((staff) => (
                <TableRow key={staff.id} className="border-b border-[#232A3B] hover:bg-[#282E42]">
                  <TableCell className="font-semibold text-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 flex items-center justify-center text-xs font-black">
                        {staff.avatarInitials}
                      </div>
                      {staff.name} {staff.id === currentUser?.id && "(You)"}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-[#E2E8F0]">
                    <div className="flex items-center gap-1">
                      {staff.role === 'admin' ? <ShieldAlert className="h-3.5 w-3.5 text-[#E6007E]" /> : <Coffee className="h-3.5 w-3.5 text-[#94A3B8]" />}
                      {staff.role}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {staff.role === 'admin' ? (
                        <span className="bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">All Access</span>
                      ) : (
                        <>
                          {staff.canManageMenu && <span className="bg-[#131824] text-[#E6007E] border border-[#E6007E]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Menu</span>}
                          {staff.canManageInventory && <span className="bg-[#131824] text-[#E6007E] border border-[#E6007E]/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Inventory</span>}
                          {!staff.canManageMenu && !staff.canManageInventory && <span className="text-[#64748B] text-[10px] italic">POS Only</span>}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#94A3B8] text-xs">
                    {staff.shiftStart ? new Date(staff.shiftStart).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-[#94A3B8] hover:text-[#E2E8F0]"
                        onClick={() => handleEditClick(staff)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-[#FF3366] hover:bg-[#FF3366]/10"
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
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
            <DialogHeader>
              <DialogTitle className="text-[#E2E8F0] text-lg font-bold">Edit Account</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">
                Update staff member information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                <Input 
                  placeholder="e.g. David" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Role</label>
                <Select value={editRole} onValueChange={(value: Role) => setEditRole(value)}>
                  <SelectTrigger className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRole === "cashier" && (
                <div className="grid gap-3 p-4 bg-[#131824] rounded-lg border border-[#232A3B]">
                  <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider">Additional Permissions</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="edit-manage-menu"
                        checked={editCanManageMenu}
                        onChange={(e) => setEditCanManageMenu(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#00F2FE]"
                      />
                      <label htmlFor="edit-manage-menu" className="text-sm font-medium cursor-pointer text-[#E2E8F0]">Access Menu Management</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="edit-manage-inventory"
                        checked={editCanManageInventory}
                        onChange={(e) => setEditCanManageInventory(e.target.checked)}
                        className="h-4 w-4 rounded accent-[#00F2FE]"
                      />
                      <label htmlFor="edit-manage-inventory" className="text-sm font-medium cursor-pointer text-[#E2E8F0]">Access Inventory</label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">New PIN (Leave blank to keep current)</label>
                <Input 
                  type="password" 
                  inputMode="numeric"
                  placeholder="••••" 
                  value={editPin} 
                  onChange={(e) => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                />
              </div>
              {editPin && (
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase text-[#94A3B8]">Confirm New PIN</label>
                  <Input 
                    type="password" 
                    inputMode="numeric"
                    placeholder="••••" 
                    value={editConfirmPin} 
                    onChange={(e) => setEditConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-[#2D3448] text-[#94A3B8] hover:bg-[#282E42]" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black" onClick={handleUpdateAccount}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
            <DialogHeader>
              <DialogTitle className="text-[#E2E8F0] text-lg font-bold">Confirm Staff Deletion</DialogTitle>
              <DialogDescription className="py-4 text-[#94A3B8]">
                Are you sure you want to delete <strong className="text-[#E2E8F0]">{staffToDelete?.name}</strong>? This action will permanently remove their access.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 border-[#2D3448] text-[#94A3B8] hover:bg-[#282E42]">Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1 bg-[#FF3366] text-white hover:bg-[#FF1A96]">Delete Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
