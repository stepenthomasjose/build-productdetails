import React, { useEffect, useMemo, useState } from "react";
import fetchProductDetails from "../axios/axios";

const ProductDetails = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await fetchProductDetails();

        if (!isMounted) return;

        setProduct(data);

        const firstAvailableVariant = (data.variants || []).find(
          (variant) => variant.available !== false
        );

        if (firstAvailableVariant) {
          setSelectedVariantId(firstAvailableVariant.id);
        }
      } catch (err) {
        if (!isMounted) return;

        console.error("Failed to load product:", err);

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load product details."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, []);

  const variants = Array.isArray(product?.variants)
    ? product.variants
    : [];

  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId
  );

  // The actual API uses product_images rather than images.
  const images = useMemo(() => {
    if (!product) return [];

    const source =
      product.product_images ??
      product.images ??
      [];

    if (!Array.isArray(source)) return [];

    return source
      .map((image) => {
        if (typeof image === "string") {
          return { url: image, alt: product.name || "Product image" };
        }

        return {
          id: image.id,
          url: image.url ?? image.image_url ?? image.src ?? "",
          alt: image.alt ?? image.alt_text ?? product.name ?? "Product image",
        };
      })
      .filter((image) => Boolean(image.url));
  }, [product]);

  // Specifications are an array in the actual API response.
  const specifications = useMemo(() => {
    if (!product) return [];

    const source = product.specifications;

    if (Array.isArray(source)) {
      return source
        .map((item) => {
          if (typeof item === "string") {
            return { label: item, value: "" };
          }

          if (!item || typeof item !== "object") return null;

          return {
            label:
              item.name ??
              item.label ??
              item.key ??
              item.specification_name ??
              "Specification",
            value:
              item.value ??
              item.display_value ??
              item.specification_value ??
              "",
          };
        })
        .filter(Boolean);
    }

    if (source && typeof source === "object") {
      return Object.entries(source).map(([label, value]) => ({
        label: label
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value:
          value !== null && typeof value === "object"
            ? JSON.stringify(value)
            : value,
      }));
    }

    return [];
  }, [product]);

  const getOptions = (variant) => {
    const options = variant?.options ?? {};

    return {
      size: options.size ?? options.Size ?? null,
      color: options.color ?? options.Color ?? null,
    };
  };

  const getVariantLabel = (variant) => {
    const options = getOptions(variant);
    const values = [options.size, options.color].filter(Boolean);

    return values.length
      ? values.join(" / ")
      : variant.name || variant.id || "Variant";
  };

  const sizes = [
    ...new Set(
      variants
        .map((variant) => getOptions(variant).size)
        .filter(Boolean)
    ),
  ];

  const colors = [
    ...new Set(
      variants
        .map((variant) => getOptions(variant).color)
        .filter(Boolean)
    ),
  ];

  const selectedOptions = getOptions(selectedVariant);

  // A size is selectable only when at least one available variant
  // exists for that size and the currently selected color.
  const isSizeAvailable = (size) =>
    variants.some((variant) => {
      const options = getOptions(variant);

      return (
        options.size === size &&
        variant.available !== false &&
        (!selectedOptions.color || options.color === selectedOptions.color)
      );
    });

  const isColorAvailable = (color) =>
    variants.some((variant) => {
      const options = getOptions(variant);

      return (
        options.color === color &&
        variant.available !== false &&
        (!selectedOptions.size || options.size === selectedOptions.size)
      );
    });

  const selectSize = (size) => {
    const matchingVariant = variants.find((variant) => {
      const options = getOptions(variant);

      return (
        options.size === size &&
        (!selectedOptions.color || options.color === selectedOptions.color) &&
        variant.available !== false
      );
    });

    if (matchingVariant) {
      setSelectedVariantId(matchingVariant.id);
      setCartMessage("");
    } else {
      const firstAvailable = variants.find((variant) => {
        const options = getOptions(variant);

        return options.size === size && variant.available !== false;
      });

      if (firstAvailable) {
        setSelectedVariantId(firstAvailable.id);
        setCartMessage("");
      }
    }
  };

  const selectColor = (color) => {
    const matchingVariant = variants.find((variant) => {
      const options = getOptions(variant);

      return (
        options.color === color &&
        (!selectedOptions.size || options.size === selectedOptions.size) &&
        variant.available !== false
      );
    });

    if (matchingVariant) {
      setSelectedVariantId(matchingVariant.id);
      setCartMessage("");
    } else {
      const firstAvailable = variants.find((variant) => {
        const options = getOptions(variant);

        return options.color === color && variant.available !== false;
      });

      if (firstAvailable) {
        setSelectedVariantId(firstAvailable.id);
        setCartMessage("");
      }
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") {
      return "Price unavailable";
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice)) {
      return String(price);
    }

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: product?.currency || "INR",
        maximumFractionDigits: 2,
      }).format(numericPrice);
    } catch {
      return `₹${numericPrice.toLocaleString("en-IN")}`;
    }
  };

  const productPrice =
    selectedVariant?.price ?? product?.price;

  const availabilityText =
    selectedVariant?.available === false
      ? "Out of Stock"
      : product?.availability || "Availability not specified";

  const isAvailable =
    selectedVariant
      ? selectedVariant.available !== false
      : variants.length === 0 &&
        !/out of stock|sold out|unavailable/i.test(
          String(product?.availability ?? "")
        );

  const handleAddToCart = () => {
    setCartMessage("");

    if (variants.length > 0 && !selectedVariant) {
      setCartMessage("Please select an available variant.");
      return;
    }

    if (!isAvailable) {
      setCartMessage("This product or variant is unavailable.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setCartMessage("Please enter a valid quantity.");
      return;
    }

    if (
      selectedVariant?.stock_quantity != null &&
      quantity > Number(selectedVariant.stock_quantity)
    ) {
      setCartMessage(
        `Only ${selectedVariant.stock_quantity} item(s) are available.`
      );
      return;
    }

    setCartMessage(
      `Added ${quantity} item(s) — ${product.name}${
        selectedVariant ? ` (${getVariantLabel(selectedVariant)})` : ""
      }. This is a frontend demo; no cart API is connected.`
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="animate-pulse text-sm text-gray-500">
          Loading product details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="font-semibold text-red-700">
          Unable to load product
        </p>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <p className="p-8 text-center text-gray-500">
        Product not found.
      </p>
    );
  }

  const activeImage = images[activeImageIdx];

  const changeImage = (direction) => {
    if (!images.length) return;

    setActiveImageIdx(
      (current) =>
        (current + direction + images.length) % images.length
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 font-sans text-gray-900 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-2 text-xs text-gray-500"
      >
        <span>Home</span>
        <span>/</span>
        <span>Products</span>
        <span>/</span>
        <span className="font-medium text-gray-900">
          {product.name || "Product details"}
        </span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-2 md:gap-9">
        {/* Product gallery */}
        <section className="min-w-0">
          <div className="group relative flex aspect-square max-h-[600px] items-center justify-center overflow-hidden rounded-lg bg-gray-50">
            {activeImage?.url ? (
              <img
                src={activeImage.url}
                alt={activeImage.alt}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  className="h-20 w-20"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span className="text-sm">No product image available</span>
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => changeImage(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl shadow hover:bg-gray-100"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => changeImage(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl shadow hover:bg-gray-100"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image.id || image.url || index}
                  onClick={() => setActiveImageIdx(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={activeImageIdx === index}
                  className={`aspect-square overflow-hidden rounded border-2 bg-gray-50 p-1 ${
                    activeImageIdx === index
                      ? "border-gray-900"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Product information */}
        <section className="min-w-0">
          <span
            className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
              isAvailable
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {availabilityText}
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {product.name || "Product"}
          </h1>

          <p className="mt-2 text-xs text-gray-500">
            SKU: {product.sku || product.product_code || "N/A"}
          </p>

          <p className="mt-4 text-2xl font-bold">
            {formatPrice(productPrice)}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Inclusive of all taxes, where applicable
          </p>

          <div className="my-6 border-t border-gray-200" />

          {/* Variant selection */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold">Size</h2>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const active = selectedOptions.size === size;
                  const available = isSizeAvailable(size);

                  return (
                    <button
                      type="button"
                      key={size}
                      disabled={!available}
                      onClick={() => selectSize(size)}
                      aria-pressed={active}
                      className={`min-w-12 rounded border px-3 py-2 text-sm transition ${
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 hover:border-gray-900"
                      } disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold">Color</h2>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const active = selectedOptions.color === color;
                  const available = isColorAvailable(color);

                  const swatchClass = /yellow|gold/i.test(color)
                    ? "bg-amber-400"
                    : /rose|pink/i.test(color)
                      ? "bg-rose-300"
                      : /silver|white/i.test(color)
                        ? "bg-gray-200"
                        : "bg-gray-400";

                  return (
                    <button
                      type="button"
                      key={color}
                      disabled={!available}
                      onClick={() => selectColor(color)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                        active
                          ? "border-gray-900 ring-1 ring-gray-900"
                          : "border-gray-300 hover:border-gray-900"
                      } disabled:cursor-not-allowed disabled:opacity-35`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full border border-black/10 ${swatchClass}`}
                      />
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {variants.length > 0 && (
            <div className="mb-5">
              <label
                htmlFor="product-variant"
                className="mb-2 block text-sm font-semibold"
              >
                Select variant
              </label>
              <select
                id="product-variant"
                value={selectedVariantId}
                onChange={(event) => {
                  setSelectedVariantId(event.target.value);
                  setCartMessage("");
                }}
                className="w-full rounded border border-gray-300 bg-white px-3 py-3 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="">Choose an available variant</option>
                {variants.map((variant) => (
                  <option
                    key={variant.id}
                    value={variant.id}
                    disabled={variant.available === false}
                  >
                    {getVariantLabel(variant)}
                    {variant.available === false ? " — Out of stock" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold">Quantity</h2>
            <div className="flex h-11 w-36 items-center overflow-hidden rounded border border-gray-300">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="h-full w-10 bg-gray-50 text-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                −
              </button>
              <span className="flex h-full flex-1 items-center justify-center border-x border-gray-300 text-sm">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  const stock = Number(selectedVariant?.stock_quantity);

                  setQuantity((current) =>
                    selectedVariant?.stock_quantity != null &&
                    Number.isFinite(stock)
                      ? Math.min(current + 1, stock)
                      : current + 1
                  );
                  setCartMessage("");
                }}
                disabled={
                  selectedVariant?.stock_quantity != null &&
                  quantity >= Number(selectedVariant.stock_quantity)
                }
                aria-label="Increase quantity"
                className="h-full w-10 bg-gray-50 text-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable || (variants.length > 0 && !selectedVariant)}
            className="w-full rounded bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {!isAvailable ? "Currently Unavailable" : "Add to Cart"}
          </button>

          {cartMessage && (
            <p
              role="status"
              className={`mt-3 text-sm ${
                cartMessage.startsWith("Added")
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {cartMessage}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 border-b border-gray-200 pb-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">♧</span>
              <div>
                <p className="text-xs font-semibold">Free Shipping</p>
                <p className="mt-1 text-xs text-gray-500">
                  Shipping terms apply
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">♢</span>
              <div>
                <p className="text-xs font-semibold">Secure Payment</p>
                <p className="mt-1 text-xs text-gray-500">
                  Secure checkout
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">◇</span>
              <div>
                <p className="text-xs font-semibold">Easy Returns</p>
                <p className="mt-1 text-xs text-gray-500">
                  Check return policy
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Description */}
      <section className="mt-10 border-t border-gray-200 pt-7">
        <h2 className="mb-4 text-lg font-bold">Description</h2>
        <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
          {product.description || "No description available."}
        </p>
      </section>

      {/* Specifications */}
      {specifications.length > 0 && (
        <section className="mt-8 border-t border-gray-200 pt-7">
          <h2 className="mb-4 text-lg font-bold">Specifications</h2>

          <div className="overflow-hidden rounded border border-gray-200">
            {specifications
              .filter(
                (item) =>
                  item.value !== null &&
                  item.value !== undefined &&
                  String(item.value).trim() !== ""
              )
              .map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <span className="text-gray-600">{item.label}</span>
                  <strong className="text-right font-medium">
                    {String(item.value)}
                  </strong>
                </div>
              ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default ProductDetails;
