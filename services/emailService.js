import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
    constructor() {
        // REST API Configuration (Primary)
        this.apiConfig = {
            baseUrl: process.env.CYBERMAIL_BASE_URL || 'https://platform.cyberpersons.com/email',
            apiKey: process.env.CYBERMAIL_API_KEY,
            fromEmail: process.env.FROM_EMAIL || 'support@tmobiletecstore.com',
            fromName: process.env.FROM_NAME || 'TmobileTec'
        };

        // SMTP Configuration (Fallback)
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'mail.cyberpersons.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USERNAME,
                pass: process.env.SMTP_PASSWORD
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Test both services
        this.testServices();
    }

    async testServices() {
        // Test REST API
        if (this.apiConfig.fromEmail) {
            try {
                const response = await fetch(`${this.apiConfig.baseUrl}/v1/account/stats`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    console.log('✅ REST API is ready');
                } else {
                    console.log('⚠️ REST API connection issue, will use SMTP fallback');
                }
            } catch (error) {
                console.log('⚠️ REST API unavailable, will use SMTP fallback');
            }
        } else {
            console.log('⚠️ REST API not configured (missing FROM_EMAIL), will use SMTP');
        }

        // SMTP test disabled - only used as fallback
    }

    async sendViaRestAPI(emailData) {
        try {
            const response = await fetch(`${this.apiConfig.baseUrl}/v1/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: this.apiConfig.fromEmail,
                    from_name: this.apiConfig.fromName,
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html,
                    text: emailData.text || this.stripHtml(emailData.html)
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Email sent via REST API:', result.message_id || 'success');
                return { success: true, messageId: result.message_id, method: 'REST_API' };
            } else {
                const error = await response.text();
                console.error('❌ REST API error:', error);
                throw new Error(`REST API failed: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ REST API send failed:', error.message);
            throw error;
        }
    }

    async sendViaSMTP(emailData) {
        try {
            const result = await this.transporter.sendMail({
                from: `"${this.apiConfig.fromName}" <${this.apiConfig.fromEmail}>`,
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text || this.stripHtml(emailData.html)
            });
            console.log('✅ Email sent via SMTP:', result.messageId);
            return { success: true, messageId: result.messageId, method: 'SMTP' };
        } catch (error) {
            console.error('❌ SMTP send failed:', error.message);
            throw error;
        }
    }

    async sendEmail(emailData) {
        // Try REST API first
        try {
            return await this.sendViaRestAPI(emailData);
        } catch (restError) {
            console.log('🔄 REST API failed, trying SMTP fallback...');
            
            // Fallback to SMTP
            try {
                return await this.sendViaSMTP(emailData);
            } catch (smtpError) {
                console.error('❌ Both email methods failed');
                return { 
                    success: false, 
                    error: `REST API: ${restError.message}, SMTP: ${smtpError.message}` 
                };
            }
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');
            
            // Replace variables in template
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, variables[key]);
            });
            
            return template;
        } catch (error) {
            console.error(`Error loading email template ${templateName}:`, error);
            return this.getDefaultTemplate(templateName, variables);
        }
    }

    getDefaultTemplate(templateName, variables) {
        const baseStyle = `
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(122deg, #c26af5, #54f0ff); color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 12px 24px; background: linear-gradient(122deg, #c26af5, #54f0ff); color: white; text-decoration: none; border-radius: 5px; }
                .order-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
                .total { font-weight: bold; font-size: 18px; color: #c26af5; }
            </style>
        `;

        switch (templateName) {
            case 'order-confirmation':
                return `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyle}</head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Order Confirmation</h1>
                                <p>Thank you for your order!</p>
                            </div>
                            <div class="content">
                                <h2>Order #${variables.orderId}</h2>
                                <p>Hi ${variables.customerName},</p>
                                <p>Your order has been successfully placed and is being processed.</p>
                                
                                <div class="order-details">
                                    <h3>Order Details:</h3>
                                    ${variables.orderItems}
                                    <div class="total">Total: ${variables.totalAmount}</div>
                                </div>
                                
                                <div class="order-details">
                                    <h3>Shipping Address:</h3>
                                    <p>${variables.shippingAddress}</p>
                                </div>
                                
                                <div class="order-details">
                                    <h3>Billing Address:</h3>
                                    <p>${variables.billingAddress}</p>
                                </div>
                                
                                <p>We'll send you another email when your order ships.</p>
                            </div>
                            <div class="footer">
                                <p>© 2026 TmobileTec. All rights reserved.</p>
                                <p>If you have any questions, contact us at support@tmobiletech.com</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
            
            case 'password-reset':
                return `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyle}</head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Password Reset</h1>
                            </div>
                            <div class="content">
                                <p>Hi ${variables.userName || 'there'},</p>
                                <p>You requested to reset your password. Click the button below to create a new password:</p>
                                <p style="text-align: center; margin: 30px 0;">
                                    <a href="${variables.resetLink}" class="button">Reset Password</a>
                                </p>
                                <p>This link will expire in 1 hour for security reasons.</p>
                                <p>If you didn't request this password reset, please ignore this email.</p>
                            </div>
                            <div class="footer">
                                <p>© 2026 TmobileTec. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
            
            default:
                return `
                    <!DOCTYPE html>
                    <html>
                    <head>${baseStyle}</head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>TmobileTec</h1>
                            </div>
                            <div class="content">
                                <p>Thank you for using TmobileTec!</p>
                            </div>
                            <div class="footer">
                                <p>© 2026 TmobileTec. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
        }
    }

    async sendOrderConfirmation(orderData) {
        try {
            const { order, customer, orderItems } = orderData;
            
            // Debug logging
            console.log('📧 Email data received:', JSON.stringify({
                order: { _id: order._id, total: order.total, totalAmount: order.totalAmount },
                customer: customer,
                orderItems: orderItems
            }, null, 2));
            
            // Format order items for email
            const itemsHtml = orderItems.map((item, index) => {
                console.log(`Item ${index}:`, item);
                const itemName = item.name || 'Product';
                const itemQty = item.quantity || 1;
                const itemPrice = item.price || 0;
                const itemTotal = itemQty * itemPrice;
                
                return `
                    <div class="product-item">
                        <strong>${itemName}</strong><br>
                        Quantity: ${itemQty} × $${itemPrice.toFixed(2)} = $${itemTotal.toFixed(2)}
                    </div>
                `;
            }).join('');

            const orderDate = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            const emailVariables = {
                orderId: order.orderNumber || order._id,
                orderDate: orderDate,
                customerName: customer.firstName || customer.name || 'Customer',
                orderItems: itemsHtml,
                totalAmount: `$${(order.totalAmount || order.total || 0).toFixed(2)}`,
                shippingAddress: this.formatAddress(order.shippingAddress),
                billingAddress: this.formatAddress(order.billingAddress)
            };

            const htmlContent = await this.loadTemplate('order-confirmation', emailVariables);

            const emailData = {
                to: customer.email,
                subject: `Your TmobileTec Order Confirmation - #${order.orderNumber || order._id}`,
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending order confirmation email:', error);
            console.error('Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    async sendPasswordReset(email, resetToken, isAdmin = false) {
        try {
            const clientUrl = process.env.CLIENT_URL || 'https://sunny-queijadas-69a94f.netlify.app';
            const adminUrl = process.env.ADMIN_URL || 'https://peppy-hummingbird-2e2acb.netlify.app';
            
            const baseUrl = isAdmin ? adminUrl : clientUrl;
            const resetPath = isAdmin ? 'admin/reset-password' : 'reset-password';
            const resetLink = `${baseUrl}/${resetPath}?token=${resetToken}`;
            
            const emailVariables = {
                userName: email.split('@')[0],
                resetLink: resetLink
            };

            const htmlContent = await this.loadTemplate('password-reset', emailVariables);

            const emailData = {
                to: email,
                subject: `Reset Your TmobileTec Password`,
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendPasswordChanged(email, customerName) {
        try {
            const emailVariables = {
                customerName: customerName || email.split('@')[0]
            };

            const htmlContent = await this.loadTemplate('password-changed', emailVariables);

            const emailData = {
                to: email,
                subject: 'Your Password Has Been Changed',
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending password changed email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendWelcomeEmail(email, customerName) {
        try {
            const emailVariables = {
                customerName: customerName || email.split('@')[0],
                customerEmail: email
            };

            const htmlContent = await this.loadTemplate('welcome', emailVariables);

            const emailData = {
                to: email,
                subject: 'Welcome to TmobileTec',
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendEmailVerification(email, customerName, verificationToken) {
        try {
            const baseUrl = process.env.CLIENT_URL || 'https://sunny-queijadas-69a94f.netlify.app';
            const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
            
            const emailVariables = {
                customerName: customerName || email.split('@')[0],
                verificationLink: verificationLink
            };

            const htmlContent = await this.loadTemplate('email-verification', emailVariables);

            const emailData = {
                to: email,
                subject: 'Verify Your Email Address',
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending email verification:', error);
            return { success: false, error: error.message };
        }
    }

    async sendOrderProcessing(orderData) {
        try {
            const { order, customer } = orderData;
            
            const emailVariables = {
                customerName: customer.firstName || customer.name || 'Customer',
                orderId: order.orderNumber || order._id
            };

            const htmlContent = await this.loadTemplate('order-processing', emailVariables);

            const emailData = {
                to: customer.email,
                subject: 'Your TmobileTec Order Is Being Processed',
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending order processing email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendOrderShipped(orderData) {
        try {
            const { order, customer, orderItems } = orderData;
            
            const itemsHtml = orderItems.map(item => {
                const itemName = item.name || 'Product';
                const itemQty = item.quantity || 1;
                const itemPrice = item.price || 0;
                
                return `
                    <div class="product-item">
                        <strong>${itemName}</strong> - Quantity: ${itemQty} × $${itemPrice.toFixed(2)}
                    </div>
                `;
            }).join('');

            const trackingUrl = order.tracking?.url ? 
                `<p><a href="${order.tracking.url}" style="color: #4caf50; font-weight: bold;">Track Your Package</a></p>` : '';

            const emailVariables = {
                customerName: customer.firstName || customer.name || 'Customer',
                orderId: order.orderNumber || order._id,
                customerEmail: customer.email,
                trackingCarrier: order.tracking?.carrier || 'Standard Shipping',
                trackingNumber: order.tracking?.number || 'Will be updated soon',
                trackingUrl: trackingUrl,
                orderItems: itemsHtml
            };

            const htmlContent = await this.loadTemplate('order-shipped', emailVariables);

            const emailData = {
                to: customer.email,
                subject: 'Your TmobileTec Order Has Shipped / Ready for Pickup!',
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending order shipped email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendOrderCancelled(orderData) {
        try {
            const { order, customer, refundAmount } = orderData;
            
            let refundInfo = '';
            if (refundAmount && refundAmount > 0) {
                refundInfo = `
                    <div class="refund-box">
                        <p><strong>Refund Information:</strong></p>
                        <p>A refund of $${refundAmount.toFixed(2)} has been issued to your original payment method.</p>
                        <p>Please allow 5-10 business days for the funds to appear, depending on your bank or payment provider.</p>
                    </div>
                `;
            }

            const emailVariables = {
                customerName: customer.firstName || customer.name || 'Customer',
                orderId: order.orderNumber || order._id,
                refundInfo: refundInfo
            };

            const htmlContent = await this.loadTemplate('order-cancelled', emailVariables);

            const emailData = {
                to: customer.email,
                subject: 'Update on Your TmobileTec  Order',
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending order cancelled email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSupportAcknowledgement(email, customerName, referenceNumber, messageSummary) {
        try {
            const emailVariables = {
                customerName: customerName || email.split('@')[0],
                referenceNumber: referenceNumber,
                messageSummary: messageSummary
            };

            const htmlContent = await this.loadTemplate('support-acknowledgement', emailVariables);

            const emailData = {
                to: email,
                subject: "We've Received Your Message",
                html: htmlContent
            };

            return await this.sendEmail(emailData);
        } catch (error) {
            console.error('❌ Error sending support acknowledgement email:', error);
            return { success: false, error: error.message };
        }
    }

    formatAddress(address) {
        if (!address) return 'N/A';
        
        return `
            ${address.firstName || ''} ${address.lastName || ''}<br>
            ${address.address1 || ''}<br>
            ${address.address2 ? address.address2 + '<br>' : ''}
            ${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}<br>
            ${address.country || ''}
        `;
    }

    // Background email sending (non-blocking)
    async sendEmailAsync(emailFunction, ...args) {
        // Use setTimeout to make it non-blocking
        setTimeout(async () => {
            try {
                await emailFunction.apply(this, args);
            } catch (error) {
                console.error('Background email sending failed:', error);
            }
        }, 0);
    }
}

export default new EmailService();