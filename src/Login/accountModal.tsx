import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, ShieldAlert, Coffee, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type Staff } from "@/hooks/use-auth";

export function AccountModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (o: boolean) => void }) {
  const { staffList, user, addStaff, deleteStaff, updateStaff } = useAuth();
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  
  // States for Add
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"cashier" | "admin">("cashier");
  const [newPin, setNewPin] = useState("");

  // States for Deletion
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{id: string, name: string} | null>(null);

  // States for Edit
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"cashier" | "admin">("cashier");
  const [updatedPin, setUpdatedPin] = useState("");
  const [confirmUpdatedPin, setConfirmUpdatedPin] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (user && user.role !== 'admin') {
        handleEditClick(user);
      } else {
        setView("list");
      }
    }
  }, [isOpen, user]);

  const handleDelete = (id: string, name: string) => {
    if (user?.role !== 'admin') return;
    if (id === user?.id) {
      return toast.error("You cannot delete your own account while logged in.");
    }
    setStaffToDelete({ id, name });
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!staffToDelete || user?.role !== 'admin') return;
    try {
      await deleteStaff(staffToDelete.id);
      toast.success(`${staffToDelete.name} deleted.`);
      setIsDeleteConfirmOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      toast.error("Failed to delete staff member");
    }
  };

  const handleAddAccount = async () => {
    if (user?.role !== 'admin') return;
    if (!newName.trim()) return toast.error("Name required");
    if (newPin.length < 4) return toast.error("PIN must be at least 4 digits");

    const result = await addStaff({
      name: newName.trim(),
      role: newRole,
      avatarColor: "bg-primary"
    }, newPin);
    
    if (result.success) {
      toast.success(`${newName} added!`);
      setNewName(""); setNewPin(""); setView("list");
    } else {
      toast.error(result.message);
    }
  };

  const handleEditClick = (staff: Staff) => {
    if (user?.role !== 'admin' && user?.id !== staff.id) return;
    setSelectedStaff(staff);
    setEditName(staff.name);
    setEditRole(staff.role);
    setUpdatedPin("");
    setConfirmUpdatedPin("");
    setView("edit");
  };

  const handleUpdateAccount = async () => {
    if (!selectedStaff) return;
    if (!editName.trim()) return toast.error("Name is required");

    if (updatedPin) {
      if (updatedPin.length < 4) return toast.error("PIN must be at least 4 digits");
      if (updatedPin !== confirmUpdatedPin) return toast.error("PINs do not match");
    }

    const result = await updateStaff(selectedStaff.id, {
      name: editName.trim(),
      role: user?.role === 'admin' ? editRole : selectedStaff.role, // Only admins can change roles
    }, updatedPin || undefined);

    if (result.success) {
      toast.success(result.message);
      setUpdatedPin(""); setConfirmUpdatedPin(""); setSelectedStaff(null); 
      if (user?.role === 'admin') {
        setView("list");
      } else {
        onOpenChange(false); // Close modal for non-admins
      }
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user?.role === 'admin' ? "Team Management" : "Account Settings"}</DialogTitle>
          <DialogDescription>
            {user?.role === 'admin' 
              ? "Manage POS access and security PINs." 
              : "Update your account information and PIN."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* VIEW: LIST STAFF */}
          {view === "list" && user?.role === 'admin' && (
            <div className="flex flex-col gap-4">
              <Button onClick={() => setView("add")} className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Plus className="mr-2 h-4 w-4" /> Add New Staff
              </Button>
              <div className="flex flex-col gap-2 mt-2">
                {staffList.map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {staff.avatarInitials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold">{staff.name} {staff.id === user?.id && "(You)"}</span>
                        <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                          {staff.role === 'admin' ? <ShieldAlert className="h-3 w-3" /> : <Coffee className="h-3 w-3" />} {staff.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(staff)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10" 
                        onClick={() => handleDelete(staff.id, staff.name)}
                        disabled={staff.id === user?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: ADD STAFF */}
          {view === "add" && user?.role === 'admin' && (
            <div className="flex flex-col gap-4">
              <Button variant="ghost" className="w-fit -ml-4" onClick={() => setView("list")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
              </Button>
              <div className="space-y-2"><label className="text-sm font-medium">Name</label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                  <Button variant="ghost" onClick={() => setNewRole("cashier")} className={`rounded-md ${newRole === "cashier" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Cashier</Button>
                  <Button variant="ghost" onClick={() => setNewRole("admin")} className={`rounded-md ${newRole === "admin" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Admin</Button>
                </div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">PIN (4-6 digits)</label><Input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} /></div>
              <Button className="mt-2" onClick={handleAddAccount}>Save Account</Button>
            </div>
          )}

          {/* VIEW: EDIT STAFF */}
          {view === "edit" && selectedStaff && (
            <div className="flex flex-col gap-4">
              {user?.role === 'admin' && (
                <Button variant="ghost" className="w-fit -ml-4" onClick={() => { setView("list"); setUpdatedPin(""); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
                </Button>
              )}
              <h3 className="font-semibold text-lg border-b pb-2">
                {user?.id === selectedStaff.id ? "Your Account" : `Edit Account: ${selectedStaff.name}`}
              </h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              {user?.role === 'admin' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                    <Button variant="ghost" onClick={() => setEditRole("cashier")} className={`rounded-md ${editRole === "cashier" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Cashier</Button>
                    <Button variant="ghost" onClick={() => setEditRole("admin")} className={`rounded-md ${editRole === "admin" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Admin</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">New PIN (Leave blank to keep current)</label>
                <Input type="password" inputMode="numeric" value={updatedPin} onChange={e => setUpdatedPin(e.target.value.replace(/\D/g, ''))} />
              </div>

              {updatedPin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New PIN</label>
                  <Input type="password" inputMode="numeric" value={confirmUpdatedPin} onChange={e => setConfirmUpdatedPin(e.target.value.replace(/\D/g, ''))} />
                </div>
              )}

              <Button className="mt-2" onClick={handleUpdateAccount}>Update Account</Button>
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="py-4">
              Are you sure you want to permanently delete <strong>{staffToDelete?.name}</strong>? This will revoke their access to the POS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1">Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
