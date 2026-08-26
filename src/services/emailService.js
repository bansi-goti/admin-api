const sendReviewRequestEmail = async (order) => {
  try {
    const customerEmail = order.customer?.email || order.shippingAddress?.email;
    const customerName = order.customer?.name || 'Valued Customer';
    const orderId = order.orderId || order._id;

    if (!customerEmail) {
      console.log(`[Review Email Trigger] No email found for Order ${orderId}`);
      return;
    }

    const reviewLink = `http://localhost:3000/orders?reviewOrderId=${order._id}`;

    console.log(`\n==================================================`);
    console.log(`✉️ [EMAIL NOTIFICATION SENT] Order Delivered Review Request`);
    console.log(`To: ${customerEmail} (${customerName})`);
    console.log(`Subject: How was your Nayzora order ${orderId}? Leave a review & win rewards!`);
    console.log(`Body: Hello ${customerName},\nYour order ${orderId} has been successfully DELIVERED! We hope you love your purchase.\nPlease take a moment to share your feedback and upload photo/video reviews here:\n${reviewLink}\nThank you for shopping with Nayzora!`);
    console.log(`==================================================\n`);
  } catch (error) {
    console.warn('Error sending review request email:', error.message);
  }
};

module.exports = {
  sendReviewRequestEmail,
};
