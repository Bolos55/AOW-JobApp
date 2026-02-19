// backend/utils/emailService.js
import { Resend } from 'resend';

// ✅ สร้าง Resend instance
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ ฟังก์ชันส่งอีเมลผ่าน Resend
const sendEmailViaResend = async (to, subject, html) => {
  try {
    // ✅ ตรวจสอบว่ามี API Key หรือไม่
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') {
      console.log('📧 MOCK EMAIL MODE - Email would be sent to:', to);
      console.log('📧 Subject:', subject);
      console.log('⚠️ RESEND_API_KEY not configured. Using mock mode.');
      
      return { 
        success: true, 
        messageId: 'mock-' + Date.now(),
        mockMode: true,
        provider: 'mock'
      };
    }

    // ✅ ส่งอีเมลผ่าน Resend
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'AOW Job App <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html
    });

    console.log('✅ Email sent via Resend:', result.data?.id || result.id);
    return { 
      success: true, 
      messageId: result.data?.id || result.id, 
      provider: 'resend' 
    };
    
  } catch (error) {
    console.error('❌ Send email via Resend error:', error);
    
    // ✅ ถ้า error เป็น API key ไม่ถูกต้อง ให้ใช้ mock mode
    if (error.message?.includes('API key') || error.message?.includes('Invalid')) {
      console.log('⚠️ Invalid RESEND_API_KEY. Using mock mode.');
      return { 
        success: true, 
        messageId: 'mock-' + Date.now(),
        mockMode: true,
        provider: 'mock',
        warning: 'Invalid API key - using mock mode'
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      provider: 'resend'
    };
  }
};

// ✅ ส่งอีเมลยืนยัน
export const sendVerificationEmail = async (email, name, verificationToken) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    
    const subject = '🔐 ยืนยันอีเมลเพื่อเปิดใช้งานบัญชี - AOW Job App';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ยินดีต้อนรับ!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">AOW - All of Works</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">สวัสดี ${name}!</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            ขอบคุณที่สมัครสมาชิก AOW Job App 🚀
          </p>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            เพื่อความปลอดภัยและยืนยันว่าอีเมลนี้เป็นของคุณจริง กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมล:
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verificationLink}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            ✅ ยืนยันอีเมลของฉัน
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h3 style="color: #856404; margin-top: 0;">⏰ สำคัญ!</h3>
          <ul style="color: #856404; line-height: 1.6;">
            <li>ลิงก์นี้จะหมดอายุใน <strong>24 ชั่วโมง</strong></li>
            <li>หากไม่ยืนยันภายในเวลาที่กำหนด บัญชีจะถูกลบอัตโนมัติ</li>
            <li>หลังยืนยันแล้ว คุณจะสามารถเข้าใช้งานระบบได้ทันที</li>
          </ul>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h3 style="color: #1565c0; margin-top: 0;">📧 ข้อมูลบัญชีของคุณ</h3>
          <p style="color: #1565c0; margin: 5px 0;"><strong>อีเมล:</strong> ${email}</p>
          <p style="color: #1565c0; margin: 5px 0;"><strong>ชื่อ:</strong> ${name}</p>
          <p style="color: #1565c0; margin: 5px 0;"><strong>วันที่สมัคร:</strong> ${new Date().toLocaleDateString('th-TH')}</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 14px;">
          <p>หากคุณไม่ได้สมัครสมาชิก AOW Job App กรุณาเพิกเฉยต่ออีเมลนี้</p>
          <p>ลิงก์จะหมดอายุอัตโนมัติและบัญชีจะถูกลบ</p>
          <br>
          <p style="margin: 0;">
            <strong>AOW Job App</strong><br>
            ระบบหางานและรับสมัครงานออนไลน์<br>
            📧 ${process.env.EMAIL_FROM || 'support@aow-jobapp.com'}
          </p>
        </div>
      </div>
    `;

    // ✅ ส่งอีเมลผ่าน Resend
    const result = await sendEmailViaResend(email, subject, html);
    
    if (result.success) {
      return { 
        success: true, 
        messageId: result.messageId,
        mockMode: result.mockMode,
        verificationLink: result.mockMode ? verificationLink : undefined,
        provider: result.provider,
        warning: result.warning
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Send verification email error:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ส่งอีเมลแจ้งเตือนการสมัครสำเร็จ
export const sendWelcomeEmail = async (email, name, role) => {
  try {
    const roleText = role === 'employer' ? 'นายจ้าง' : 'ผู้หางาน';
    const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/`;
    
    const subject = '🎉 ยินดีต้อนรับสู่ AOW Job App - เริ่มต้นใช้งานได้เลย!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ยินดีต้อนรับ!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">บัญชีของคุณพร้อมใช้งานแล้ว</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">สวัสดี ${name}!</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            ขอบคุณที่ยืนยันอีเมลเรียบร้อยแล้ว ✅
          </p>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            บัญชี<strong>${roleText}</strong>ของคุณพร้อมใช้งานแล้ว เริ่มต้นการใช้งาน AOW Job App กันเลย!
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${dashboardLink}" 
             style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);">
            🚀 เข้าใช้งานระบบ
          </a>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">🎯 ขั้นตอนต่อไป</h3>
          ${role === 'employer' ? `
            <ul style="color: #2e7d32; line-height: 1.8;">
              <li><strong>กรอกข้อมูลบริษัท</strong> - เพิ่มรายละเอียดบริษัทและโลโก้</li>
              <li><strong>โพสต์งานแรก</strong> - เริ่มรับสมัครพนักงานใหม่</li>
              <li><strong>จัดการใบสมัคร</strong> - ดูและคัดเลือกผู้สมัครงาน</li>
              <li><strong>ใช้ระบบแชท</strong> - สื่อสารกับผู้สมัครงาน</li>
            </ul>
          ` : `
            <ul style="color: #2e7d32; line-height: 1.8;">
              <li><strong>กรอกข้อมูลส่วนตัว</strong> - เพิ่มประวัติและทักษะ</li>
              <li><strong>อัปโหลดเรซูเม่</strong> - แนบไฟล์ CV ของคุณ</li>
              <li><strong>ค้นหางาน</strong> - เริ่มสมัครงานที่ใช่</li>
              <li><strong>ใช้ระบบแชท</strong> - สื่อสารกับนายจ้าง</li>
            </ul>
          `}
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 14px;">
          <p><strong>AOW Job App</strong> - ระบบหางานและรับสมัครงานออนไลน์</p>
          <p>📧 ${process.env.EMAIL_FROM || 'support@aow-jobapp.com'}</p>
        </div>
      </div>
    `;

    // ✅ ส่งอีเมลผ่าน Resend
    const result = await sendEmailViaResend(email, subject, html);
    
    if (result.success) {
      return { 
        success: true, 
        messageId: result.messageId,
        mockMode: result.mockMode,
        provider: result.provider,
        warning: result.warning
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Send welcome email error:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ส่งอีเมลรีเซ็ตรหัสผ่าน
export const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const subject = '🔐 รีเซ็ตรหัสผ่าน - AOW Job App';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 รีเซ็ตรหัสผ่าน</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">AOW - All of Works</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #333; margin-top: 0;">สวัสดี ${name}!</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี AOW Job App ของคุณ
          </p>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            หากคุณเป็นผู้ขอรีเซ็ตรหัสผ่าน กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${resetLink}" 
             style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);">
            🔑 รีเซ็ตรหัสผ่าน
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h3 style="color: #856404; margin-top: 0;">⚠️ สำคัญ!</h3>
          <ul style="color: #856404; line-height: 1.6;">
            <li>ลิงก์นี้จะหมดอายุใน <strong>15 นาที</strong></li>
            <li>ใช้ได้เพียงครั้งเดียวเท่านั้น</li>
            <li>หากไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</li>
            <li>เพื่อความปลอดภัย ไม่ควรแชร์ลิงก์นี้กับผู้อื่น</li>
          </ul>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 30px 0;">
          <h3 style="color: #1565c0; margin-top: 0;">📧 ข้อมูลการขอรีเซ็ต</h3>
          <p style="color: #1565c0; margin: 5px 0;"><strong>อีเมล:</strong> ${email}</p>
          <p style="color: #1565c0; margin: 5px 0;"><strong>เวลาที่ขอ:</strong> ${new Date().toLocaleString('th-TH')}</p>
          <p style="color: #1565c0; margin: 5px 0;"><strong>หมดอายุ:</strong> ${new Date(Date.now() + 15 * 60 * 1000).toLocaleString('th-TH')}</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 14px;">
          <p><strong>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน</strong></p>
          <p>กรุณาเพิกเฉยต่ออีเมลนี้ ลิงก์จะหมดอายุอัตโนมัติใน 15 นาที</p>
          <br>
          <p style="margin: 0;">
            <strong>AOW Job App</strong><br>
            ระบบหางานและรับสมัครงานออนไลน์<br>
            📧 ${process.env.EMAIL_FROM || 'support@aow-jobapp.com'}
          </p>
        </div>
      </div>
    `;

    // ✅ ส่งอีเมลผ่าน Resend
    const result = await sendEmailViaResend(email, subject, html);
    
    if (result.success) {
      return { 
        success: true, 
        messageId: result.messageId,
        mockMode: result.mockMode,
        resetLink: result.mockMode ? resetLink : undefined,
        provider: result.provider,
        warning: result.warning
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Send password reset email error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};