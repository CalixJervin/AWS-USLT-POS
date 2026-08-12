import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Calendar, Sparkles, CheckCircle2, AlertTriangle, Store, QrCode, Download, Upload, Trash2, CreditCard } from "lucide-react";
import type { Product } from "@/hooks/useCart";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useGCashSettings, downloadGCashQrCode } from "@/hooks/useGCashSettings";
import { useMyPreOrders } from "@/components/MyPreOrdersModal";
import { checkDeviceLockout, recordOrderAttempt } from "@/lib/rateLimiter";

interface PreOrderModalProps {
  item: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPreOrder?: (orderData: any) => void;
}

export function PreOrderModal({
  item,
  isOpen,
  onClose,
  onConfirmPreOrder,
}: PreOrderModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const [gcashRefNumber, setGcashRefNumber] = useState("");
  const [gcashReceiptImage, setGcashReceiptImage] = useState<string>("");
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedOrderNum, setGeneratedOrderNum] = useState("");

  const gcashSettings = useGCashSettings();
  const { saveMyPreOrder } = useMyPreOrders();

  const isShirtProduct = Boolean(
    item && (
      item.name.toLowerCase().includes("shirt") || 
      item.name.toLowerCase().includes("t-shirt") ||
      item.name.toLowerCase().includes("tshirt") ||
      item.name.toLowerCase().includes("apparel") ||
      item.name.toLowerCase().includes("jersey") ||
      item.name.toLowerCase().includes("hoodie") ||
      item.name.toLowerCase().includes("jacket")
    )
  );

  const shirtSizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

  useEffect(() => {
    if (isOpen) {
      setSelectedSize(isShirtProduct ? "L" : "Standard");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setPaymentMethod("cash");
      setGcashRefNumber("");
      setGcashReceiptImage("");
      setViewReceiptUrl(null);
      setIsProcessing(false);
      setIsSuccess(false);
      setGeneratedOrderNum("");
    }
  }, [isOpen, item, isShirtProduct]);

  const handleReceiptFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, etc.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setGcashReceiptImage(dataUrl);
          toast.success("GCash receipt screenshot attached!");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!item) return null;

  const isEmailValid = customerEmail.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const isFormValid = customerName.trim() !== "" && 
                      (customerPhone.trim() !== "" || (customerEmail.trim() !== "" && isEmailValid)) && 
                      isEmailValid;

  const handleSaveOrder = async (isPayLater: boolean) => {
    // 1. Device Lockout check (10-minute timeout for 3 rapid orders)
    const lockout = checkDeviceLockout();
    if (lockout.isLocked) {
      toast.error(`Device Lockout: 3 rapid orders detected. Please wait ${lockout.remainingMinutes} minute(s) before placing another order.`);
      return;
    }

    if (isProcessing) return;

    if (!customerName.trim()) {
      toast.error("Please provide your full name.");
      return;
    }
    if (!customerPhone.trim() && !customerEmail.trim()) {
      toast.error("Please provide a phone number or email address.");
      return;
    }
    if (customerEmail.trim() && !isEmailValid) {
      toast.error("Please provide a valid email address (e.g., name@domain.com).");
      return;
    }
    if (!isPayLater && paymentMethod === "gcash") {
      if (!gcashRefNumber.trim()) {
        toast.error("Please provide your GCash reference number.");
        return;
      }
      if (!gcashReceiptImage) {
        toast.error("Please attach a screenshot of your GCash receipt.");
        return;
      }
    }

    // 2. Record order attempt & check if 3rd attempt triggers 10-minute lockout
    const attemptResult = recordOrderAttempt();
    if (attemptResult.triggeredLockout) {
      toast.error("Device Lockout: 3 rapid order attempts detected. Your device is timed out for 10 minutes to prevent order flooding.");
      return;
    }

    setIsProcessing(true);
    const orderNum = `#PO-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrderId = `preorder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sizeName = isShirtProduct ? selectedSize : "Standard";
    const displayName = isShirtProduct ? `${item.name} (${selectedSize})` : item.name;

    const finalPaymentMethod = isPayLater ? "pay_later" : paymentMethod;
    const finalPaymentStatus: "Unpaid" | "Pending Verification" | "Cash Pending" = isPayLater
      ? "Unpaid"
      : paymentMethod === "gcash"
      ? "Pending Verification"
      : "Cash Pending";

    // 1. Save to local my preorders for customer tab persistence
    saveMyPreOrder({
      id: newOrderId,
      orderNumber: orderNum,
      itemName: displayName,
      price: item.price,
      size: sizeName,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      gcashRefNumber: isPayLater ? "" : gcashRefNumber.trim(),
      gcashReceiptImage: isPayLater ? undefined : gcashReceiptImage,
      createdAt: new Date().toISOString()
    });

    try {
      const bc = new BroadcastChannel("timpla_my_preorders_channel");
      bc.postMessage({ type: "PREORDER_SAVED" });
      bc.close();
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("timpla_my_preorders_updated"));
    } catch (e) {}

    // 2. Persist to Supabase orders
    try {
      const orderPayload: any = {
        total: item.price,
        status: isPayLater ? "unpaid" : "pending_counter",
        order_number: orderNum,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        fulfillment_status: "pre_ordered",
        payment_method: finalPaymentMethod,
        gcash_ref_number: isPayLater ? null : (paymentMethod === "gcash" ? gcashRefNumber.trim() : null),
        gcash_receipt_url: isPayLater ? null : (paymentMethod === "gcash" ? gcashReceiptImage : null)
      };

      let dbOrder: any = null;

      let resWithAllFields = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (resWithAllFields.error) {
        console.warn("Supabase full pre-order insert notice:", resWithAllFields.error.message);
        // Fallback without order_number, payment_method, gcash fields if columns are missing in DB schema
        delete orderPayload.order_number;
        delete orderPayload.payment_method;
        delete orderPayload.gcash_ref_number;
        delete orderPayload.gcash_receipt_url;
        resWithAllFields = await supabase
          .from("orders")
          .insert(orderPayload)
          .select()
          .single();
      }

      if (resWithAllFields.data) {
        dbOrder = resWithAllFields.data;
      }

      if (dbOrder) {
        const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
        await supabase.from("order_items").insert({
          order_id: dbOrder.id,
          product_id: isValidUuid(item.id) ? item.id : null,
          variant_id: isValidUuid(item.variantId) ? item.variantId : null,
          product_name: displayName,
          size: sizeName,
          price: item.price,
          quantity: 1
        });

        // Sync DB ID to local storage pre-orders so local and DB share exact same ID
        try {
          const mySaved = localStorage.getItem("timpla_my_saved_preorders");
          if (mySaved) {
            const parsed = JSON.parse(mySaved);
            const updated = parsed.map((o: any) => (o.id === newOrderId || o.orderNumber === orderNum) ? { ...o, id: dbOrder.id } : o);
            localStorage.setItem("timpla_my_saved_preorders", JSON.stringify(updated));
            window.dispatchEvent(new Event("timpla_my_preorders_updated"));
          }
        } catch (e) {}
      }

      setGeneratedOrderNum(orderNum);
      setIsSuccess(true);
      if (onConfirmPreOrder) {
        onConfirmPreOrder({ item, selectedSize, customerName, customerEmail, customerPhone, orderNum });
      }
      toast.success(isPayLater ? `Pre-order saved as Pay Later! Order Number: ${orderNum}` : `Pre-order submitted! Order Number: ${orderNum}`);
    } catch (err: any) {
      console.warn("Pre-order stored locally:", err);
      setGeneratedOrderNum(orderNum);
      setIsSuccess(true);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 10000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-lg bg-[#131824] border-2 border-[#232A3B] text-[#E2E8F0] p-0 overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,242,254,0.15)] flex flex-col max-h-[90vh] my-auto"
      >
        
        {/* MODAL HEADER - POS MATCHING DESIGN */}
        <DialogHeader className="p-4 sm:p-5 bg-[#1E2333] border-b border-[#232A3B] flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-3 pr-6">
            <div className="p-2.5 rounded-xl bg-[#E6007E]/20 border border-[#E6007E]/40 text-[#E6007E] shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-[#E2E8F0] tracking-tight">
                Pre-Order Merchandise
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* MODAL BODY - SCROLLABLE CONTENT */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-[#0B0E14]">
          {isSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-[#00F2FE]/20 border border-[#00F2FE] flex items-center justify-center text-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-black text-[#E2E8F0]">Pre-Order Confirmed!</h3>
              
              <div className="bg-[#1E2333] border border-[#00F2FE]/40 p-4 rounded-xl text-center w-full my-2">
                <div className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-widest">Pre-Order Ticket Number</div>
                <div className="text-3xl font-black text-[#00F2FE] mt-1 tracking-wider">{generatedOrderNum}</div>
              </div>

              <p className="text-[11px] text-[#94A3B8] italic">
                You can manage or pay for this order anytime via the button near the search bar!
              </p>

              <Button
                onClick={onClose}
                className="mt-2 w-full bg-[#E6007E] text-white hover:bg-[#FF1A96] font-bold rounded-full h-11 cursor-pointer"
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* ITEM CARD BANNER / ORDER PREVIEW */}
              <div className="bg-[#1E2333] border border-[#2D3448] rounded-2xl p-2 flex gap-4 sm:gap-5 items-center relative overflow-hidden shadow-xl shrink-0 group">
                {/* SUBTLE BACKGROUND AMBIENT GLOW */}
                <div className="absolute -left-10 -top-10 w-36 h-36 bg-[#E6007E]/10 rounded-full blur-2xl pointer-events-none" />

                {/* PRODUCT IMAGE CONTAINER */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square bg-[#131824] rounded-xl border border-[#232A3B] flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative z-10">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Sparkles className="h-8 w-8 text-[#00F2FE]" />
                  )}
                </div>
                
                {/* PRODUCT DETAILS */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-1.5 relative z-10">

                  <h4 className="text-sm sm:text-base font-black text-[#E2E8F0] tracking-tight leading-snug break-words">
                    {item.name}
                  </h4>
                  
                  <div className="flex items-center justify-between gap-2 mt-0.5 pt-2 border-t border-[#232A3B]">
                    <div className="text-base sm:text-xl font-black text-[#E6007E] drop-shadow-[0_0_10px_rgba(230,0,126,0.25)]">
                      ₱{item.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#94A3B8] font-semibold bg-[#131824] px-2.5 py-1 rounded-lg border border-[#232A3B] shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-[#00F2FE] shrink-0" />
                      <span>Est: Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SHIRT SIZE SELECTOR (ONLY FOR SHIRT/MERCH PRODUCTS) */}
              {isShirtProduct && (
                <div className="flex flex-col gap-2 bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-[#00F2FE] tracking-wider">
                      Shirt Size
                    </label>
                    <span className="text-xs text-[#E6007E] font-black uppercase">
                      Size: {selectedSize}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {shirtSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          selectedSize === size
                            ? "bg-[#E6007E] text-white shadow-md shadow-[#E6007E]/30 border border-[#FF1A96]"
                            : "bg-[#1E2333] text-[#94A3B8] border border-[#2D3448] hover:bg-[#282E42] hover:text-[#E2E8F0]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTACT FORM */}
              <div className="flex flex-col gap-3 bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
                <label className="text-xs font-bold uppercase text-[#00F2FE] tracking-wider flex items-center gap-1.5">
                  Customer Contact Details
                  <span className="text-[#FF3366] text-[10px] font-bold uppercase">(Required)</span>
                </label>

                <div className="flex flex-col gap-2.5">
                  <Input
                    type="text"
                    placeholder="Full Name (e.g., Juan Dela Cruz)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-Z\s.-]/g, ""))}
                    className="h-10 text-base bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#00F2FE]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={11}
                      placeholder="Mobile # (0917...)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      className="h-10 text-base bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#00F2FE]"
                    />
                    <Input
                      type="email"
                      placeholder="Email (e.g., name@domain.com)"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className={`h-10 text-base bg-[#1E2333] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#00F2FE] ${!isEmailValid ? "border-[#FF3366] text-[#FF3366]" : "border-[#2D3448]"}`}
                    />
                  </div>
                </div>

                {customerEmail.trim() !== "" && !isEmailValid && (
                  <p className="text-[11px] text-[#FF3366]">
                    ⚠️ Invalid email format. Please enter a valid email address.
                  </p>
                )}

                {!isFormValid && (customerEmail.trim() === "" || isEmailValid) && (
                  <p className="text-[11px] text-[#FF3366]">
                    Please provide your name and a valid phone number or email for contact purposes.
                  </p>
                )}
              </div>

              {/* PAYMENT METHOD SELECTION - UNIFIED WITH POS MODALS */}
              <div className="flex flex-col gap-3 bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
                <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider">
                  Payment Method
                </label>

                <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] rounded-lg border border-[#232A3B]">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-md cursor-pointer font-bold text-xs h-10 transition-all ${
                      paymentMethod === "cash"
                        ? "bg-[#E6007E] text-white border border-[#00F2FE]/40 shadow-sm font-black"
                        : "text-[#94A3B8] hover:text-[#E2E8F0]"
                    }`}
                  >
                    Cash / Counter
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentMethod("gcash")}
                    className={`rounded-md cursor-pointer font-bold text-xs h-10 transition-all ${
                      paymentMethod === "gcash"
                        ? "bg-[#E6007E] text-white border border-[#00F2FE]/40 shadow-sm font-black"
                        : "text-[#94A3B8] hover:text-[#E2E8F0]"
                    }`}
                  >
                    GCash
                  </Button>
                </div>

                {/* CASH NOTICE */}
                {paymentMethod === "cash" && (
                  <div className="bg-[#1E2333] p-4 rounded-xl border border-[#00F2FE]/40 text-center flex flex-col items-center justify-center gap-2">
                    <Store className="h-7 w-7 text-[#00F2FE]" />
                    <span className="font-black text-sm text-[#00F2FE]">Pay Cash at Counter</span>
                    <p className="text-xs text-[#94A3B8]">
                      Please pay at the counter/booth or to your respective year representatives to confirm your pre-order.
                    </p>
                  </div>
                )}

                {/* GCASH QR & REFERENCE CODE INPUT */}
                {paymentMethod === "gcash" && (
                  <div className="bg-[#1E2333] p-4 rounded-xl border border-[#E6007E]/40 flex flex-col items-center justify-center gap-3">
                    <div className="flex flex-col items-center gap-2 w-full text-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Scan QR Code to Pay via GCash
                      </span>

                      {/* QR CODE CONTAINER */}
                      <div className="w-full max-w-[180px] aspect-square bg-[#131824] border-2 border-dashed border-[#00F2FE]/50 rounded-2xl p-2 flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.15)] my-1 relative overflow-hidden">
                        {gcashSettings.gcashQrImage ? (
                          <img
                            src={gcashSettings.gcashQrImage}
                            alt="GCash QR Code"
                            className="w-full h-full object-contain rounded-lg bg-white p-1"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-center p-2">
                            <div className="p-3 bg-[#131824] rounded-full border border-[#00F2FE]/40 text-[#00F2FE]">
                              <QrCode className="h-8 w-8 animate-pulse" />
                            </div>
                            <span className="text-[11px] font-bold text-[#E2E8F0]">GCash QR Code</span>
                            <span className="text-[10px] text-[#94A3B8]">Scan at counter</span>
                          </div>
                        )}
                      </div>

                      {/* DOWNLOAD QR BUTTON */}
                      {gcashSettings.gcashQrImage && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => downloadGCashQrCode(gcashSettings.gcashQrImage)}
                          className="w-full max-w-[180px] h-8 text-xs border-[#00F2FE]/50 text-[#00F2FE] hover:bg-[#00F2FE]/10 font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download QR Code</span>
                        </Button>
                      )}

                      {/* GCASH REF NUMBER INPUT */}
                      <div className="flex flex-col gap-1.5 w-full text-left mt-1">
                        <label className="text-[11px] font-bold text-[#E2E8F0] flex items-center justify-between">
                          <span>GCash Reference Number</span>
                          <span className="text-[#FF3366] text-[10px] font-bold uppercase">(Required for GCash)</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter 13-digit Reference #"
                          value={gcashRefNumber}
                          onChange={(e) => setGcashRefNumber(e.target.value)}
                          className="h-10 text-base bg-[#131824] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#00F2FE]"
                        />
                      </div>

                      {/* RECEIPT SCREENSHOT ATTACHMENT (REQUIRED) */}
                      <div className="flex flex-col gap-1.5 w-full text-left mt-1">
                        <label className="text-[11px] font-bold text-[#E2E8F0] flex items-center justify-between">
                          <span>Attach GCash Receipt Screenshot</span>
                          <span className="text-[#FF3366] text-[10px] font-bold uppercase">(Required for GCash)</span>
                        </label>

                        {gcashReceiptImage ? (
                          <div className="relative bg-[#131824] border border-[#00F2FE]/50 rounded-xl p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <img
                                src={gcashReceiptImage}
                                alt="Receipt Screenshot"
                                onClick={() => setViewReceiptUrl(gcashReceiptImage)}
                                className="w-12 h-12 object-cover rounded-lg border border-[#00F2FE]/40 cursor-pointer hover:scale-105 transition-transform"
                              />
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-[#E2E8F0]">Receipt Screenshot</span>
                                <button
                                  type="button"
                                  onClick={() => setViewReceiptUrl(gcashReceiptImage)}
                                  className="text-[11px] text-[#00F2FE] font-medium underline text-left cursor-pointer"
                                >
                                  Click to view full image
                                </button>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setGcashReceiptImage("")}
                              className="h-8 w-8 text-[#FF3366] hover:bg-[#FF3366]/10 rounded-lg shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="bg-[#131824] border border-dashed border-[#00F2FE]/40 hover:border-[#00F2FE] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                            <Upload className="h-5 w-5 text-[#00F2FE]" />
                            <div className="text-center">
                              <span className="text-xs font-bold text-[#00F2FE]">Upload GCash Receipt Screenshot <span className="text-[#FF3366]">*</span></span>
                              <div className="text-[10px] text-[#64748B]">PNG, JPG, or JPEG up to 10MB</div>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleReceiptFileChange(file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SMALL INFORMATIONAL PAYMENT WARNING (NON-BLOCKING) */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Note: Failure to submit payment on time will result in your order being cancelled.</span>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER - ALWAYS VISIBLE AT BOTTOM, NEVER LOCKED */}
        {!isSuccess && (() => {
          const lockout = checkDeviceLockout();
          const isLocked = lockout.isLocked;
          const isGcashIncomplete = paymentMethod === "gcash" && (!gcashRefNumber.trim() || !gcashReceiptImage);
          return (
            <DialogFooter className="p-4 bg-[#1E2333] border-t border-[#232A3B] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {paymentMethod === "gcash" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSaveOrder(true)}
                  disabled={isProcessing || isLocked}
                  className={`w-full sm:w-auto border-[#FF9900]/50 text-[#FF9900] hover:bg-[#FF9900]/10 hover:text-[#FF9900] font-bold text-xs sm:text-sm rounded-full h-11 px-5 transition-all ${
                    isProcessing || isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {isLocked ? `Timed Out (${lockout.remainingMinutes}m)` : isProcessing ? "Processing..." : "Pay Later"}
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="button"
                onClick={() => handleSaveOrder(false)}
                disabled={isProcessing || isLocked || isGcashIncomplete}
                className={`w-full sm:w-auto bg-[#E6007E] text-white hover:bg-[#FF1A96] font-black text-xs sm:text-sm px-6 rounded-full h-11 shadow-lg border border-[#00F2FE]/40 transition-all flex items-center justify-center gap-2 ${
                  isProcessing || isLocked || isGcashIncomplete
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {isLocked ? `Timed Out (${lockout.remainingMinutes}m)` : isProcessing ? "Processing..." : "Submit Pre-Order"}
              </Button>
            </DialogFooter>
          );
        })()}
      </DialogContent>

      {/* LIGHTBOX RECEIPT SCREENSHOT PREVIEW DIALOG */}
      <Dialog open={Boolean(viewReceiptUrl)} onOpenChange={(open) => { if (!open) setViewReceiptUrl(null); }}>
        <DialogContent className="sm:max-w-xl bg-[#131824] border-[#00F2FE]/40 text-[#E2E8F0] p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
          <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-[#232A3B] pb-3">
            <DialogTitle className="text-base font-extrabold text-[#E2E8F0] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#00F2FE]" />
              GCash Receipt Screenshot
            </DialogTitle>
          </DialogHeader>

          {viewReceiptUrl && (
            <div className="w-full flex flex-col items-center gap-3">
              <img
                src={viewReceiptUrl}
                alt="Submitted GCash Receipt"
                className="max-h-[65vh] w-auto object-contain rounded-xl border border-[#232A3B] bg-black/40 shadow-lg"
              />
              <div className="flex gap-2 w-full justify-end pt-2 border-t border-[#232A3B]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewReceiptUrl(null)}
                  className="text-xs font-bold border-[#2D3448] text-[#E2E8F0] hover:bg-[#1E2333] h-9 px-4 rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
