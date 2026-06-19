import crypto from 'crypto';

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_MODE = process.env.CASHFREE_MODE || 'sandbox';

const BASE_URL = CASHFREE_MODE === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

/**
 * Creates an order in Cashfree
 * @param {object} params
 * @param {string} params.orderId
 * @param {number} params.orderAmount - amount in INR (float)
 * @param {object} params.customerDetails
 * @param {string} params.customerDetails.customerId
 * @param {string} params.customerDetails.customerName
 * @param {string} params.customerDetails.customerEmail
 * @param {string} params.customerDetails.customerPhone
 */
export async function createCashfreeOrder({ orderId, orderAmount, customerDetails }) {
  // Mock mode for local testing without valid Cashfree credentials
  if (CASHFREE_CLIENT_ID === 'TEST_CLIENT_ID_PLACEHOLDER' || CASHFREE_CLIENT_SECRET === 'TEST_SECRET_KEY_PLACEHOLDER') {
    console.log(`[CASHFREE MOCK] Intercepting request. Creating mock order: ${orderId} for ₹${orderAmount}`);
    return {
      payment_session_id: `mock_session_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      order_id: orderId,
      cf_order_id: `mock_cf_${Date.now()}`,
      order_status: 'ACTIVE'
    };
  }

  const url = `${BASE_URL}/orders`;

  const payload = {
    order_id: orderId,
    order_amount: Number(parseFloat(orderAmount).toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: customerDetails.customerId,
      customer_name: customerDetails.customerName,
      customer_email: customerDetails.customerEmail,
      customer_phone: customerDetails.customerPhone,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': CASHFREE_CLIENT_ID,
      'x-client-secret': CASHFREE_CLIENT_SECRET,
      'x-api-version': '2023-08-01',
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.message || 'Failed to create Cashfree order');
  }

  return responseData;
}

/**
 * Cryptographically verifies Cashfree Webhook Signature
 * @param {string} rawBody - Raw webhook request body
 * @param {string} timestamp - x-webhook-timestamp header
 * @param {string} signature - x-webhook-signature header
 */
export function verifyCashfreeSignature(rawBody, timestamp, signature) {
  if (!timestamp || !signature || !rawBody) {
    return false;
  }

  const payload = timestamp + rawBody;
  const computedSignature = crypto
    .createHmac('sha256', CASHFREE_CLIENT_SECRET)
    .update(payload)
    .digest('base64');

  return computedSignature === signature;
}
