// backend/utils/pricingUtils.js

/**
 * ✅ Platform Service Fee Configuration
 * ค่าบริการแพลตฟอร์มสำหรับการโพสต์งานและบริการเสริม
 * ราคาทั้งหมดเป็นราคารวม (inclusive) สำหรับ Phase 0-1
 * เตรียมโครงสร้างสำหรับแยก VAT ในอนาคต
 */

// ✅ Platform Service Packages (ค่าบริการแพลตฟอร์ม - รวมภาษีแล้ว สำหรับ Phase 0-1)
export const SERVICE_PACKAGES = {
  standard: {
    id: 'standard',
    name: 'แพ็กเกจงานปกติ',
    description: 'ค่าบริการโพสต์งาน 30 วัน',
    duration: 30,
    // Phase 0-1: ค่าบริการรวมภาษีแล้ว
    serviceFeeInclusive: 199, // ค่าบริการที่ต้องจ่าย
    // เตรียมไว้สำหรับอนาคต (เมื่อแยก VAT)
    serviceFeeExclusive: 186, // 199 / 1.07 (เมื่อมี VAT 7%)
    features: ['โพสต์งาน 30 วัน', 'รับใบสมัครไม่จำกัด', 'แชทกับผู้สมัคร'],
    serviceType: 'job_posting'
  },
  premium: {
    id: 'premium',
    name: 'แพ็กเกจงานพรีเมียม',
    description: 'ค่าบริการโพสต์งาน 30 วัน + ความสำคัญพิเศษ',
    duration: 30,
    serviceFeeInclusive: 299,
    serviceFeeExclusive: 280, // 299 / 1.07
    features: ['ทุกอย่างของงานปกติ', 'ความสำคัญในการค้นหา', 'ไอคอนพรีเมียม'],
    serviceType: 'job_posting'
  },
  featured: {
    id: 'featured',
    name: 'แพ็กเกจงานเด่น',
    description: 'ค่าบริการโพสต์งาน 60 วัน + แสดงในหน้าแรก',
    duration: 60,
    serviceFeeInclusive: 399,
    serviceFeeExclusive: 373, // 399 / 1.07
    features: ['ทุกอย่างของงานพรีเมียม', 'แสดงในหน้าแรก', 'โพสต์งาน 60 วัน'],
    serviceType: 'job_posting'
  }
};

// ✅ Additional Platform Services (บริการเสริม - รวมภาษีแล้ว สำหรับ Phase 0-1)
export const ADDITIONAL_SERVICES = {
  featured: {
    id: 'featured',
    name: 'บริการแสดงในหน้าแรก',
    description: 'งานของคุณจะปรากฏด้านบนสุด',
    serviceFeeInclusive: 99,
    serviceFeeExclusive: 93, // 99 / 1.07
    duration: 7, // วัน
    serviceType: 'job_boost'
  },
  urgent: {
    id: 'urgent',
    name: 'บริการงานเร่งด่วน',
    description: 'ไฮไลท์สีแดงและไอคอนเร่งด่วน',
    serviceFeeInclusive: 149,
    serviceFeeExclusive: 139, // 149 / 1.07
    duration: 7,
    serviceType: 'job_boost'
  },
  highlighted: {
    id: 'highlighted',
    name: 'บริการเน้นสีพื้นหลัง',
    description: 'พื้นหลังสีเหลืองทองสะดุดตา',
    serviceFeeInclusive: 99,
    serviceFeeExclusive: 93,
    duration: 14,
    serviceType: 'job_boost'
  },
  extended: {
    id: 'extended',
    name: 'บริการขยายเวลา +30 วัน',
    description: 'เพิ่มระยะเวลาแสดงงานอีก 30 วัน',
    serviceFeeInclusive: 199,
    serviceFeeExclusive: 186,
    duration: 30,
    serviceType: 'job_extension'
  }
};

// ✅ Tax Configuration
export const TAX_CONFIG = {
  // Phase 0-1: ไม่มี VAT
  phase0: {
    vatEnabled: false,
    vatRate: 0,
    vatNumber: null,
    feeType: 'inclusive', // ค่าบริการรวมภาษีแล้ว
    displayVat: false // ไม่แสดง VAT breakdown
  },
  
  // Phase 2+: มี VAT
  withVat: {
    vatEnabled: true,
    vatRate: 0.07, // 7%
    vatNumber: 'เลขประจำตัวผู้เสียภาษี', // จะใส่เมื่อจด VAT
    feeType: 'exclusive', // ค่าบริการไม่รวมภาษี
    displayVat: true // แสดง VAT breakdown
  }
};

/**
 * คำนวณค่าบริการแพลตฟอร์มสำหรับ Phase 0-1 (ค่าบริการรวมภาษีแล้ว)
 */
export const calculateServiceFeePhase0 = (packageType, additionalServices = []) => {
  const packageInfo = SERVICE_PACKAGES[packageType] || SERVICE_PACKAGES.standard;
  
  // คำนวณค่าบริการเสริม
  const additionalServiceItems = additionalServices.map(serviceId => {
    const service = ADDITIONAL_SERVICES[serviceId];
    if (!service) return null;
    
    return {
      serviceId: service.id,
      serviceName: service.name,
      quantity: 1,
      unitFee: service.serviceFeeInclusive, // Phase 0-1: ใช้ค่าบริการรวม
      totalFee: service.serviceFeeInclusive
    };
  }).filter(Boolean);
  
  const additionalServiceTotal = additionalServiceItems.reduce((sum, item) => sum + item.totalFee, 0);
  
  // สร้าง service breakdown
  const services = [
    {
      serviceId: packageInfo.id,
      serviceName: packageInfo.name,
      quantity: 1,
      unitFee: packageInfo.serviceFeeInclusive,
      totalFee: packageInfo.serviceFeeInclusive
    },
    ...additionalServiceItems
  ];
  
  const subtotal = packageInfo.serviceFeeInclusive + additionalServiceTotal;
  
  return {
    // Legacy fields (เพื่อ backward compatibility)
    basePrice: packageInfo.serviceFeeInclusive,
    boostPrice: additionalServiceTotal,
    totalPrice: subtotal,
    duration: packageInfo.duration,
    
    // ✅ New service fee structure
    serviceFee: subtotal, // ค่าบริการรวมที่ต้องจ่าย
    feeBreakdown: {
      subtotal: subtotal,
      taxRate: TAX_CONFIG.phase0.vatRate,
      taxAmount: 0, // Phase 0-1: ไม่มีภาษี
      totalBeforeTax: subtotal,
      totalServiceFee: subtotal, // Phase 0-1: ค่าบริการเดียวกัน
      vatEnabled: TAX_CONFIG.phase0.vatEnabled,
      vatNumber: TAX_CONFIG.phase0.vatNumber,
      services: services,
      currency: 'THB',
      locale: 'th-TH'
    },
    
    // Service Package info
    servicePackage: {
      type: packageType,
      name: packageInfo.name,
      description: packageInfo.description,
      duration: packageInfo.duration,
      features: packageInfo.features,
      serviceType: packageInfo.serviceType
    },
    
    // Additional Services info
    additionalServices: additionalServices.map(serviceId => {
      const service = ADDITIONAL_SERVICES[serviceId];
      return service ? {
        id: service.id,
        name: service.name,
        description: service.description,
        serviceFee: service.serviceFeeInclusive,
        duration: service.duration,
        serviceType: service.serviceType
      } : null;
    }).filter(Boolean)
  };
};

/**
 * คำนวณค่าบริการสำหรับอนาคต (เมื่อมี VAT)
 */
export const calculateServiceFeeWithVat = (packageType, additionalServices = [], vatNumber = null) => {
  const packageInfo = SERVICE_PACKAGES[packageType] || SERVICE_PACKAGES.standard;
  
  // คำนวณค่าบริการเสริม (ค่าบริการไม่รวม VAT)
  const additionalServiceItems = additionalServices.map(serviceId => {
    const service = ADDITIONAL_SERVICES[serviceId];
    if (!service) return null;
    
    return {
      serviceId: service.id,
      serviceName: service.name,
      quantity: 1,
      unitFee: service.serviceFeeExclusive, // ใช้ค่าบริการไม่รวม VAT
      totalFee: service.serviceFeeExclusive
    };
  }).filter(Boolean);
  
  const additionalServiceTotal = additionalServiceItems.reduce((sum, item) => sum + item.totalFee, 0);
  
  // สร้าง service breakdown
  const services = [
    {
      serviceId: packageInfo.id,
      serviceName: packageInfo.name,
      quantity: 1,
      unitFee: packageInfo.serviceFeeExclusive,
      totalFee: packageInfo.serviceFeeExclusive
    },
    ...additionalServiceItems
  ];
  
  const subtotal = packageInfo.serviceFeeExclusive + additionalServiceTotal;
  const taxAmount = Math.round(subtotal * TAX_CONFIG.withVat.vatRate);
  const totalServiceFee = subtotal + taxAmount;
  
  return {
    // Legacy fields
    basePrice: packageInfo.serviceFeeExclusive,
    boostPrice: additionalServiceTotal,
    totalPrice: totalServiceFee,
    duration: packageInfo.duration,
    
    // ✅ New service fee structure
    serviceFee: totalServiceFee,
    feeBreakdown: {
      subtotal: subtotal,
      taxRate: TAX_CONFIG.withVat.vatRate,
      taxAmount: taxAmount,
      totalBeforeTax: subtotal,
      totalServiceFee: totalServiceFee,
      vatEnabled: TAX_CONFIG.withVat.vatEnabled,
      vatNumber: vatNumber,
      services: services,
      currency: 'THB',
      locale: 'th-TH'
    },
    
    // Service Package info
    servicePackage: {
      type: packageType,
      name: packageInfo.name,
      description: packageInfo.description,
      duration: packageInfo.duration,
      features: packageInfo.features,
      serviceType: packageInfo.serviceType
    },
    
    // Additional Services info
    additionalServices: additionalServices.map(serviceId => {
      const service = ADDITIONAL_SERVICES[serviceId];
      return service ? {
        id: service.id,
        name: service.name,
        description: service.description,
        serviceFee: service.serviceFeeExclusive,
        duration: service.duration,
        serviceType: service.serviceType
      } : null;
    }).filter(Boolean)
  };
};

/**
 * Main service fee calculation function - เลือกใช้ Phase 0 หรือ VAT ตาม config
 */
export const calculateJobPricing = (packageType, boostFeatures = [], options = {}) => {
  const { vatEnabled = false, vatNumber = null } = options;
  
  if (vatEnabled && vatNumber) {
    return calculateServiceFeeWithVat(packageType, boostFeatures, vatNumber);
  } else {
    return calculateServiceFeePhase0(packageType, boostFeatures);
  }
};

/**
 * Format service fee for display
 */
export const formatServiceFee = (amount, options = {}) => {
  const { 
    currency = 'THB', 
    locale = 'th-TH',
    showCurrency = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;
  
  const formatter = new Intl.NumberFormat(locale, {
    style: showCurrency ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits
  });
  
  return formatter.format(amount);
};

/**
 * Generate service fee summary for display
 */
export const generateServiceFeeSummary = (feeBreakdown) => {
  const { services, taxAmount, totalServiceFee, vatEnabled } = feeBreakdown;
  
  const summary = {
    services: services.map(service => ({
      description: service.serviceName,
      amount: formatServiceFee(service.totalFee)
    })),
    subtotal: formatServiceFee(feeBreakdown.totalBeforeTax),
    total: formatServiceFee(totalServiceFee),
    disclaimer: "ค่าบริการแพลตฟอร์มสำหรับการโพสต์งานและบริการเสริม"
  };
  
  if (vatEnabled && taxAmount > 0) {
    summary.tax = {
      label: `VAT ${(feeBreakdown.taxRate * 100).toFixed(0)}%`,
      amount: formatServiceFee(taxAmount)
    };
  }
  
  return summary;
};

/**
 * Validate service fee data
 */
export const validateServiceFee = (feeBreakdown) => {
  const errors = [];
  
  if (!feeBreakdown.subtotal || feeBreakdown.subtotal <= 0) {
    errors.push('Service fee subtotal must be greater than 0');
  }
  
  if (feeBreakdown.vatEnabled && feeBreakdown.taxRate < 0) {
    errors.push('Tax rate cannot be negative');
  }
  
  if (feeBreakdown.totalServiceFee !== feeBreakdown.totalBeforeTax + feeBreakdown.taxAmount) {
    errors.push('Service fee calculation mismatch');
  }
  
  if (!feeBreakdown.services || feeBreakdown.services.length === 0) {
    errors.push('Service breakdown is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get current tax configuration
 */
export const getCurrentTaxConfig = () => {
  // Phase 0-1: ใช้ config แบบไม่มี VAT
  // อนาคต: อ่านจาก environment variable หรือ database
  const vatEnabled = process.env.VAT_ENABLED === 'true';
  const vatNumber = process.env.VAT_NUMBER;
  
  return vatEnabled && vatNumber ? TAX_CONFIG.withVat : TAX_CONFIG.phase0;
};

/**
 * Migration helper: Convert old pricing to new service fee structure
 */
export const migrateToServiceFee = (oldPricing) => {
  const { basePrice = 0, boostPrice = 0, totalPrice = 0 } = oldPricing;
  
  return {
    serviceFee: totalPrice,
    feeBreakdown: {
      subtotal: totalPrice,
      taxRate: 0,
      taxAmount: 0,
      totalBeforeTax: totalPrice,
      totalServiceFee: totalPrice,
      vatEnabled: false,
      vatNumber: null,
      services: [
        {
          serviceId: 'legacy_package',
          serviceName: 'แพ็กเกจบริการ',
          quantity: 1,
          unitFee: basePrice,
          totalFee: basePrice
        },
        ...(boostPrice > 0 ? [{
          serviceId: 'legacy_additional',
          serviceName: 'บริการเสริม',
          quantity: 1,
          unitFee: boostPrice,
          totalFee: boostPrice
        }] : [])
      ],
      currency: 'THB',
      locale: 'th-TH'
    }
  };
};