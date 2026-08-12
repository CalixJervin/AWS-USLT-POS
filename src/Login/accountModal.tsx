import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, ShieldAlert, Coffee, KeyRound, ArrowLeft, QrCode, Users, Upload, Image as ImageIcon, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type Staff } from "@/hooks/use-auth";
import { useGCashSettings, downloadGCashQrCode } from "@/hooks/useGCashSettings";

export function AccountModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (o: boolean) => void }) {
  const { staffList, user, addStaff, deleteStaff, updateStaff } = useAuth();
  const { gcashQrImage, updateGCashSettings } = useGCashSettings();

  const [activeTab, setActiveTab] = useState<"team" | "gcash">("team");
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  
  // GCash settings state
  const [inputGCashQrImage, setInputGCashQrImage] = useState(gcashQrImage);

  // Sync state when modal opens or settings update
  useEffect(() => {
    if (isOpen) {
      setInputGCashQrImage(gcashQrImage);
      if (user && user.role !== 'admin') {
        handleEditClick(user);
      } else {
        setView("list");
      }
    }
  }, [isOpen, user, gcashQrImage]);

  // States for Add Staff
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"cashier" | "admin">("cashier");
  const [newPin, setNewPin] = useState("");

  // States for Deletion
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{id: string, name: string} | null>(null);

  // States for Edit Staff
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"cashier" | "admin">("cashier");
  const [updatedPin, setUpdatedPin] = useState("");
  const [confirmUpdatedPin, setConfirmUpdatedPin] = useState("");

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
      role: user?.role === 'admin' ? editRole : selectedStaff.role,
    }, updatedPin || undefined);

    if (result.success) {
      toast.success(result.message);
      setUpdatedPin(""); setConfirmUpdatedPin(""); setSelectedStaff(null); 
      if (user?.role === 'admin') {
        setView("list");
      } else {
        onOpenChange(false);
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setInputGCashQrImage(event.target.result as string);
        toast.success("QR code image loaded! Click Save to apply.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGCashSettings = () => {
    updateGCashSettings({
      gcashQrImage: inputGCashQrImage.trim(),
    });
    toast.success("GCash QR code settings saved successfully!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-[#131824] border-[#232A3B] text-[#E2E8F0]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#E2E8F0]">Settings</DialogTitle>
          <DialogDescription className="text-[#94A3B8] text-xs">
            {user?.role === 'admin' 
              ? "Configure team accounts and GCash kiosk payment details." 
              : "Update your account details and security PIN."}
          </DialogDescription>
        </DialogHeader>

        {/* ADMIN TAB NAVIGATION */}
        {user?.role === 'admin' && view === "list" && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#1E2333] rounded-lg border border-[#2D3448]">
            <Button
              variant="ghost"
              onClick={() => setActiveTab("team")}
              className={`rounded-md font-bold text-xs cursor-pointer ${
                activeTab === "team" 
                  ? "bg-[#E6007E] text-white shadow-sm font-black" 
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <Users className="mr-2 h-4 w-4" /> Team Accounts
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab("gcash")}
              className={`rounded-md font-bold text-xs cursor-pointer ${
                activeTab === "gcash" 
                  ? "bg-[#E6007E] text-white shadow-sm font-black" 
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <QrCode className="mr-2 h-4 w-4" /> GCash Settings
            </Button>
          </div>
        )}

        <div className="py-2">
          {/* TAB 1: TEAM MANAGEMENT */}
          {user?.role === 'admin' && activeTab === "team" && (
            <>
              {/* VIEW: LIST STAFF */}
              {view === "list" && (
                <div className="flex flex-col gap-4">
                  <Button onClick={() => setView("add")} className="w-full bg-[#E6007E] hover:bg-[#FF1A96] text-white font-bold cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" /> Add New Staff
                  </Button>
                  <div className="flex flex-col gap-2 mt-1">
                    {staffList.map(staff => (
                      <div key={staff.id} className="flex items-center justify-between p-3 rounded-xl border border-[#2D3448] bg-[#1E2333]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#E6007E]/15 text-[#E6007E] flex items-center justify-center font-bold">
                            {staff.avatarInitials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-[#E2E8F0]">{staff.name} {staff.id === user?.id && "(You)"}</span>
                            <span className="text-xs text-[#94A3B8] capitalize flex items-center gap-1">
                              {staff.role === 'admin' ? <ShieldAlert className="h-3 w-3 text-[#00F2FE]" /> : <Coffee className="h-3 w-3 text-[#E6007E]" />} {staff.role}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(staff)} className="text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#282E42]">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-[#FF3366] hover:bg-[#FF3366]/10" 
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
              {view === "add" && (
                <div className="flex flex-col gap-4">
                  <Button variant="ghost" className="w-fit -ml-4 text-[#94A3B8] hover:text-[#E2E8F0]" onClick={() => setView("list")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
                  </Button>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Role</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#1E2333] rounded-lg border border-[#2D3448]">
                      <Button variant="ghost" onClick={() => setNewRole("cashier")} className={`rounded-md ${newRole === "cashier" ? "bg-[#E6007E] text-white font-bold" : "text-[#94A3B8]"}`}>Cashier</Button>
                      <Button variant="ghost" onClick={() => setNewRole("admin")} className={`rounded-md ${newRole === "admin" ? "bg-[#E6007E] text-white font-bold" : "text-[#94A3B8]"}`}>Admin</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">PIN (4-6 digits)</label>
                    <Input type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
                  </div>
                  <Button className="mt-2 bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black" onClick={handleAddAccount}>Save Account</Button>
                </div>
              )}

              {/* VIEW: EDIT STAFF */}
              {view === "edit" && selectedStaff && (
                <div className="flex flex-col gap-4">
                  <Button variant="ghost" className="w-fit -ml-4 text-[#94A3B8] hover:text-[#E2E8F0]" onClick={() => { setView("list"); setUpdatedPin(""); }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Team
                  </Button>
                  <h3 className="font-bold text-base text-[#E2E8F0] border-b border-[#232A3B] pb-2">
                    {user?.id === selectedStaff.id ? "Your Account" : `Edit Account: ${selectedStaff.name}`}
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">Role</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#1E2333] rounded-lg border border-[#2D3448]">
                      <Button variant="ghost" onClick={() => setEditRole("cashier")} className={`rounded-md ${editRole === "cashier" ? "bg-[#E6007E] text-white font-bold" : "text-[#94A3B8]"}`}>Cashier</Button>
                      <Button variant="ghost" onClick={() => setEditRole("admin")} className={`rounded-md ${editRole === "admin" ? "bg-[#E6007E] text-white font-bold" : "text-[#94A3B8]"}`}>Admin</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[#94A3B8]">New PIN (Leave blank to keep current)</label>
                    <Input type="password" inputMode="numeric" value={updatedPin} onChange={e => setUpdatedPin(e.target.value.replace(/\D/g, ''))} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
                  </div>

                  {updatedPin && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-[#94A3B8]">Confirm New PIN</label>
                      <Input type="password" inputMode="numeric" value={confirmUpdatedPin} onChange={e => setConfirmUpdatedPin(e.target.value.replace(/\D/g, ''))} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
                    </div>
                  )}

                  <Button className="mt-2 bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black" onClick={handleUpdateAccount}>Update Account</Button>
                </div>
              )}
            </>
          )}

          {/* TAB 2: GCASH SETTINGS (ADMIN ONLY) */}
          {user?.role === 'admin' && activeTab === "gcash" && view === "list" && (
            <div className="flex flex-col gap-5 pt-1">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-[#E6007E]" />
                  GCash QR Code Image
                </label>

                {/* QR PREVIEW BOX */}
                <div className="w-full bg-[#1E2333] border-2 border-dashed border-[#00F2FE]/40 rounded-xl p-4 flex flex-col items-center justify-center gap-3 relative min-h-[160px]">
                  {inputGCashQrImage ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <img
                        src={inputGCashQrImage}
                        alt="GCash QR Code Preview"
                        className="w-full max-w-[280px] h-auto max-h-[380px] object-contain rounded-xl border border-[#00F2FE]/30 bg-white p-2 shadow-md"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadGCashQrCode(inputGCashQrImage)}
                          className="text-xs border-[#00F2FE]/50 text-[#00F2FE] hover:bg-[#00F2FE]/10 cursor-pointer h-8"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Download QR
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInputGCashQrImage("")}
                          className="text-xs text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer h-8"
                        >
                          Remove QR Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2 py-4">
                      <div className="p-3 bg-[#131824] rounded-full border border-[#2D3448]">
                        <QrCode className="h-8 w-8 text-[#00F2FE]" />
                      </div>
                      <span className="text-xs font-bold text-[#E2E8F0]">No Custom QR Code Image Uploaded</span>
                      <span className="text-[11px] text-[#94A3B8]">
                        A clean QR Code placeholder will be displayed at kiosk checkout.
                      </span>
                    </div>
                  )}
                </div>

                {/* UPLOAD & URL CONTROLS */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Upload Image File:</label>
                  <label className="flex items-center justify-center gap-2 w-full bg-[#1E2333] hover:bg-[#282E42] border border-[#2D3448] text-[#E2E8F0] font-semibold text-xs py-2.5 px-4 rounded-lg cursor-pointer transition-all">
                    <Upload className="h-4 w-4 text-[#00F2FE]" />
                    <span>Choose Image File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-[11px] font-bold text-[#94A3B8]">Or Paste Image URL:</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/gcash-qr.png"
                    value={inputGCashQrImage.startsWith("data:") ? "" : inputGCashQrImage}
                    onChange={(e) => setInputGCashQrImage(e.target.value)}
                    className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] text-xs h-9 placeholder:text-[#64748B]"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveGCashSettings}
                className="mt-2 bg-[#E6007E] text-white hover:bg-[#FF1A96] font-black h-11 rounded-lg shadow-lg border border-[#00F2FE]/30 cursor-pointer"
              >
                <Check className="mr-2 h-4 w-4" /> Save GCash Settings
              </Button>
            </div>
          )}

          {/* NON-ADMIN VIEW */}
          {user?.role !== 'admin' && view === "edit" && selectedStaff && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-base text-[#E2E8F0] border-b border-[#232A3B] pb-2">
                Your Account Settings
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">New PIN (Leave blank to keep current)</label>
                <Input type="password" inputMode="numeric" value={updatedPin} onChange={e => setUpdatedPin(e.target.value.replace(/\D/g, ''))} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              {updatedPin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-[#94A3B8]">Confirm New PIN</label>
                  <Input type="password" inputMode="numeric" value={confirmUpdatedPin} onChange={e => setConfirmUpdatedPin(e.target.value.replace(/\D/g, ''))} className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]" />
                </div>
              )}
              <Button className="mt-2 bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black" onClick={handleUpdateAccount}>Update Account</Button>
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#131824] border-[#232A3B] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Confirm Deletion</DialogTitle>
            <DialogDescription className="py-4 text-xs text-[#94A3B8]">
              Are you sure you want to permanently delete <strong className="text-[#E2E8F0]">{staffToDelete?.name}</strong>? This will revoke their access to the POS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 border-[#2D3448] text-[#94A3B8]">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1 bg-[#FF3366] text-white">Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
