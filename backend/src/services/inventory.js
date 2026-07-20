/**
 * Inventory helpers — every stock mutation logs previous/new quantities.
 */

/**
 * Restore stock for all order line items that have variants.
 * Caller must ensure this runs at most once per order (use order.stockRestored).
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} order - Order with items[]
 * @param {string} reason - inventory log reason
 * @param {string} updatedBy
 */
async function restoreOrderStock(tx, order, reason, updatedBy) {
  for (const item of order.items || []) {
    if (!item.variantId) continue;

    const locked = await tx.$queryRaw`
      SELECT id, stock FROM "ProductVariant"
      WHERE id = ${item.variantId}
      FOR UPDATE
    `;
    const variant = locked[0];
    const previous = variant?.stock ?? 0;
    const newQty = previous + item.quantity;

    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });

    await tx.inventoryLog.create({
      data: {
        productId: item.productId,
        variantId: item.variantId,
        previousQuantity: previous,
        newQuantity: newQty,
        changeAmount: item.quantity,
        reason,
        orderId: order.id,
        updatedBy,
      },
    });
  }

  await tx.order.update({
    where: { id: order.id },
    data: { stockRestored: true },
  });
}

/**
 * Decrement variant stock under row lock; throws if insufficient.
 */
async function decrementVariantStock(tx, { productId, variantId, quantity, userId }) {
  const locked = await tx.$queryRaw`
    SELECT id, stock FROM "ProductVariant"
    WHERE id = ${variantId}
    FOR UPDATE
  `;
  const variant = locked[0];
  if (!variant || variant.stock < quantity) {
    throw new Error('Selected variant is out of stock or lacks required quantity.');
  }

  const updated = await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { decrement: quantity } },
  });

  await tx.inventoryLog.create({
    data: {
      productId,
      variantId,
      previousQuantity: variant.stock,
      newQuantity: updated.stock,
      changeAmount: -quantity,
      reason: 'checkout',
      updatedBy: `user_${userId}`,
    },
  });

  return updated;
}

module.exports = {
  restoreOrderStock,
  decrementVariantStock,
};
