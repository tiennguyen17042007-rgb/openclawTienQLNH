const state = {
  products: [],
  cart: {},
  activeCategory: "Tất cả",
  search: ""
};

const productGrid = document.getElementById("product-grid");
const categoryFilters = document.getElementById("category-filters");
const searchInput = document.getElementById("search-input");
const cartPanel = document.getElementById("cart-panel");
const cartOverlay = document.getElementById("cart-overlay");
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const toast = document.getElementById("toast");
const checkoutDialog = document.getElementById("checkout-dialog");

const formatPrice = (price) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0
}).format(price);

async function loadProducts() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Không thể tải dữ liệu sản phẩm.");
    state.products = await response.json();
    renderCategories();
    renderProducts();
  } catch (error) {
    productGrid.innerHTML = '<p class="empty-message">Không tải được dữ liệu. Hãy mở dự án bằng Live Server trong VS Code.</p>';
    console.error(error);
  }
}

function renderCategories() {
  const categories = ["Tất cả", ...new Set(state.products.map(p => p.category))];
  categoryFilters.innerHTML = categories.map(category => `
    <button class="filter-button ${category === state.activeCategory ? "active" : ""}"
      data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>
  `).join("");
}

function renderProducts() {
  const query = state.search.trim().toLocaleLowerCase("vi");
  const filtered = state.products.filter(product => {
    const matchesCategory = state.activeCategory === "Tất cả" || product.category === state.activeCategory;
    const text = `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase("vi");
    return matchesCategory && text.includes(query);
  });

  productGrid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-image" aria-label="${escapeHTML(product.name)}">${product.emoji}</div>
      <div class="product-info">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h3>${escapeHTML(product.name)}</h3>
        <p class="product-description">${escapeHTML(product.description)}</p>
        <div class="product-bottom">
          <span class="product-price">${formatPrice(product.price)}</span>
          <button class="add-button" data-add="${product.id}" aria-label="Thêm ${escapeHTML(product.name)} vào giỏ">+</button>
        </div>
      </div>
    </article>
  `).join("");
  document.getElementById("empty-message").classList.toggle("hidden", filtered.length > 0);
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  renderCart();
  showToast(`Đã thêm "${product.name}" vào giỏ hàng.`);
}

function changeQuantity(productId, amount) {
  const next = (state.cart[productId] || 0) + amount;
  if (next <= 0) delete state.cart[productId];
  else state.cart[productId] = next;
  renderCart();
}

function renderCart() {
  const entries = Object.entries(state.cart);
  const count = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const total = entries.reduce((sum, [id, quantity]) => {
    const product = state.products.find(p => p.id === id);
    return sum + (product ? product.price * quantity : 0);
  }, 0);

  cartCount.textContent = count;
  cartTotal.textContent = formatPrice(total);

  if (entries.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Giỏ hàng đang trống.<br>Hãy chọn vài sản phẩm nhé!</p>';
    return;
  }

  cartItems.innerHTML = entries.map(([id, quantity]) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return "";
    return `
      <div class="cart-item">
        <div class="cart-item-icon">${product.emoji}</div>
        <div>
          <h3>${escapeHTML(product.name)}</h3>
          <p>${formatPrice(product.price)}</p>
          <div class="quantity-controls">
            <button data-change="${id}" data-amount="-1" aria-label="Giảm số lượng">−</button>
            <span>${quantity}</span>
            <button data-change="${id}" data-amount="1" aria-label="Tăng số lượng">+</button>
          </div>
        </div>
        <button class="remove-button" data-remove="${id}" aria-label="Xóa sản phẩm">Xóa</button>
      </div>
    `;
  }).join("");
}

function openCart() {
  cartPanel.classList.add("open");
  cartOverlay.classList.remove("hidden");
  cartPanel.setAttribute("aria-hidden", "false");
}
function closeCart() {
  cartPanel.classList.remove("open");
  cartOverlay.classList.add("hidden");
  cartPanel.setAttribute("aria-hidden", "true");
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

categoryFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.activeCategory = button.dataset.category;
  renderCategories();
  renderProducts();
});
searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  renderProducts();
});
productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});
cartItems.addEventListener("click", event => {
  const change = event.target.closest("[data-change]");
  const remove = event.target.closest("[data-remove]");
  if (change) changeQuantity(change.dataset.change, Number(change.dataset.amount));
  if (remove) {
    delete state.cart[remove.dataset.remove];
    renderCart();
  }
});
document.getElementById("cart-toggle").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
document.getElementById("checkout-button").addEventListener("click", () => {
  if (Object.keys(state.cart).length === 0) {
    showToast("Giỏ hàng đang trống.");
    return;
  }
  closeCart();
  checkoutDialog.showModal();
});
document.getElementById("checkout-close").addEventListener("click", () => checkoutDialog.close());
document.getElementById("checkout-form").addEventListener("submit", event => {
  event.preventDefault();
  if (Object.keys(state.cart).length === 0) {
    checkoutDialog.close();
    showToast("Giỏ hàng đang trống.");
    return;
  }
  const formData = new FormData(event.currentTarget);
  const order = {
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    items: Object.entries(state.cart).map(([id, quantity]) => {
      const product = state.products.find(p => p.id === id);
      return { productId: id, name: product?.name, price: product?.price, quantity };
    }),
    total: Object.entries(state.cart).reduce((sum, [id, quantity]) => {
      const product = state.products.find(p => p.id === id);
      return sum + (product ? product.price * quantity : 0);
    }, 0),
    createdAt: new Date().toISOString(),
    status: "Chờ xác nhận"
  };

  // Bản demo chỉ xác nhận ở trình duyệt, chưa gửi đơn đến máy chủ.
  console.log("Đơn hàng demo:", order);
  state.cart = {};
  renderCart();
  event.currentTarget.reset();
  checkoutDialog.close();
  showToast("Đặt hàng demo thành công! Cửa hàng sẽ liên hệ xác nhận.");
});

renderCart();
loadProducts();
