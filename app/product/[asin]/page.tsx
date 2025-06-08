'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Name, Identity, Address, Avatar, EthBalance } from "@coinbase/onchainkit/identity";
import { Button } from "@/app/components/DemoComponents";
import { Icon } from "@/app/components/DemoComponents";
import { useOpenUrl } from "@coinbase/onchainkit/minikit";

// Helper function to extract price from product data
const extractPrice = (product: any): number | null => {
  const priceLocations = [
    product.buybox?.price?.value,
    product.price?.value,
    product.extracted_price,
    product.buybox?.price?.raw?.replace(/[^0-9.]/g, ''),
    product.price?.raw?.replace(/[^0-9.]/g, ''),
    product.original_price?.value,
    product.original_price?.raw?.replace(/[^0-9.]/g, ''),
  ];

  for (const price of priceLocations) {
    if (price && !isNaN(Number(price)) && Number(price) > 0) {
      return Number(price);
    }
  }

  return null;
};

// Helper function to safely get string value from object or string
const getStringValue = (value: any): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    if (value.value) return value.value;
    if (value.name) return value.name;
    if (value.text) return value.text;
    return JSON.stringify(value);
  }
  return String(value || '');
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const openUrl = useOpenUrl();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            engine: "amazon_product",
            amazon_domain: "amazon.com",
            asin: params.asin
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch product');
        }

        if (!data.product) {
          throw new Error('Product not found');
        }

        console.log('Product data:', {
          description: data.product.description,
          bullet_points: data.product.bullet_points,
          features: data.product.features
        });

        setProduct(data.product);
        
        // Set up images array
        const mainImage = data.product.main_image;
        const additionalImages = (data.product.images || [])
          .map((img: any) => img.link || img.url)
          .filter((url: string) => url !== mainImage); // Filter out the main image if it exists in additional images
        
        const images = [mainImage, ...additionalImages].filter(Boolean);
        setAllImages(images);
        setSelectedImage(images[0] || '/placeholder.png');

        // Handle variants
        if (data.product.variants && Array.isArray(data.product.variants)) {
          const processedVariants = data.product.variants.map((variant: any) => ({
            ...variant,
            selected: false,
            displayPrice: variant.buybox?.price?.value || variant.price?.value || variant.price,
            displayTitle: variant.title || variant.name || 'Option'
          }));
          setVariants(processedVariants);
          
          // Find the variant that matches the current ASIN
          const currentVariant = processedVariants.find((v: { asin: string }) => v.asin === params.asin);
          if (currentVariant) {
            setSelectedVariant(currentVariant);
          } else if (processedVariants.length > 0) {
            setSelectedVariant(processedVariants[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    if (params.asin) {
      fetchProduct();
    }
  }, [params.asin]);

  const handleVariantClick = (variant: any) => {
    setSelectedVariant(variant);
    if (variant.asin && variant.asin !== params.asin) {
      router.push(`/product/${variant.asin}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
        <div className="w-full max-w-md mx-auto px-4 py-3">
          <header className="flex justify-between items-center mb-3 h-11">
            <div>
              <div className="flex items-center space-x-2">
                <Wallet className="z-10">
                  <ConnectWallet>
                    <Name className="text-inherit" />
                  </ConnectWallet>
                  <WalletDropdown>
                    <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                      <Avatar />
                      <Name />
                      <Address />
                      <EthBalance />
                    </Identity>
                    <WalletDropdownDisconnect />
                  </WalletDropdown>
                </Wallet>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Product not found</h3>
                <p className="mt-1 text-sm text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
              </div>
            </div>
          </main>

          <footer className="mt-2 pt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--ock-text-foreground-muted)] text-xs"
              onClick={() => openUrl("https://crossmint.com")}
            >
              Powered by Crossmint
            </Button>
          </footer>
        </div>
      </div>
    );
  }

  const productPrice = extractPrice(product);
  // Simple array of all images with proper URL extraction and duplicate prevention
  const images = [
    product.main_image,
    ...(product.images || [])
      .map((img: any) => img.link || img.url || img)
      .filter((url: string) => url !== product.main_image), // Filter out the main image if it exists in additional images
    product.thumbnail
  ].filter(Boolean);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-500 p-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to search
            </Link>

            {/* Product Image Gallery */}
            <div className="relative h-96 bg-white">
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors z-10"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-600" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors z-10"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-600" />
                  </button>
                </>
              )}
              <img
                src={images[currentImageIndex] || '/placeholder.png'}
                alt={getStringValue(product.title)}
                className="w-full h-full object-contain p-4"
              />
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="p-4 space-y-6">
              {/* Title and Description */}
              <div>
                <h1 
                  className={`text-2xl font-bold text-gray-900 ${!isTitleExpanded ? 'line-clamp-2' : ''}`}
                  onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                  style={{ cursor: 'pointer' }}
                >
                  {getStringValue(product.title)}
                </h1>
                {(product.description || product.bullet_points) && (
                  <div className="mt-4 prose prose-sm text-gray-500">
                    {product.description && <p>{getStringValue(product.description)}</p>}
                    {product.bullet_points && (
                      <ul className="list-disc list-inside space-y-2 mt-4">
                        {product.bullet_points.map((point: any, index: number) => (
                          <li key={index}>{getStringValue(point)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Rating */}
              {product.rating && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-600 mt-0.5">
                    {product.rating} ({product.reviews || 0} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="text-3xl font-bold text-indigo-600">
                {productPrice ? `$${productPrice.toFixed(2)}` : 'Price not available'}
              </div>

              {/* Variants */}
              {variants.length > 0 && (
                <div>
                  <label htmlFor="variant-select" className="block text-sm font-medium text-gray-900 mb-2">
                    Select a variant
                  </label>
                  <div className="relative">
                    <select
                      id="variant-select"
                      value={selectedVariant?.asin || ''}
                      onChange={(e) => {
                        const variant = variants.find(v => v.asin === e.target.value);
                        if (variant) {
                          handleVariantClick(variant);
                        }
                      }}
                      className="w-full appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm hover:border-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {variants
                        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                        .map((variant) => (
                          <option key={variant.asin} value={variant.asin}>
                            {variant.title}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={() => router.push(`/checkout/${product.asin}`)}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
              >
                Buy Now
              </button>

              {/* Product Attributes */}
              <div className="space-y-2">
                {product.availability && (
                  <p className={`text-sm font-medium ${
                    getStringValue(product.availability).toLowerCase().includes('in stock') 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {getStringValue(product.availability)}
                  </p>
                )}
                
                {product.brand && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Brand:</span> {getStringValue(product.brand)}
                  </p>
                )}

                {product.manufacturer && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Manufacturer:</span> {getStringValue(product.manufacturer)}
                  </p>
                )}

                {product.model && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Model:</span> {getStringValue(product.model)}
                  </p>
                )}
              </div>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    {product.features.map((feature: any, index: number) => (
                      <li key={index}>{getStringValue(feature)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specifications */}
              {product.specifications && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
                  <div className="space-y-3">
                    {Array.isArray(product.specifications) ? (
                      product.specifications.map((spec: any, index: number) => (
                        <div key={index} className="flex flex-col border-b border-gray-100 pb-2">
                          <dt className="text-sm font-medium text-gray-500">
                            {getStringValue(spec.name)}
                          </dt>
                          <dd className="text-sm text-gray-900 mt-1">
                            {getStringValue(spec.value)}
                          </dd>
                        </div>
                      ))
                    ) : (
                      Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex flex-col border-b border-gray-100 pb-2">
                          <dt className="text-sm font-medium text-gray-500">
                            {key}
                          </dt>
                          <dd className="text-sm text-gray-900 mt-1">
                            {getStringValue(value)}
                          </dd>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://crossmint.com")}
          >
            Powered by Crossmint
          </Button>
        </footer>
      </div>
    </div>
  );
} 