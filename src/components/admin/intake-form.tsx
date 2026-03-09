'use client';

import { useState } from 'react';
import { analyzeCardPhoto, createInventoryItem, publishInventoryItem } from '@/lib/supabase/inventory-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AICardSuggestions {
  player?: string;
  set_name?: string;
  card_number?: string;
  year?: number;
  rarity?: string;
  language?: string;
  edition?: string;
  grade_company?: string;
  grade_value?: string;
  suggested_price_cents?: number;
  confidence?: number;
  notes?: string;
}

type CardType = 'single' | 'slab' | 'sealed';
type FormStep = 'upload' | 'ai-review' | 'confirm' | 'success';

export function IntakeForm() {
  const [step, setStep] = useState<FormStep>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [frontPhotoFile, setFrontPhotoFile] = useState<File | null>(null);
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string | null>(null);
  const [backPhotoFile, setBackPhotoFile] = useState<File | null>(null);
  const [backPhotoUrl, setBackPhotoUrl] = useState<string | null>(null);

  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AICardSuggestions | null>(null);
  const [aiConfidence, setAiConfidence] = useState(0);

  // Form state
  const [cardType, setCardType] = useState<CardType>('single');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [player, setPlayer] = useState('');
  const [setName, setSetName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [year, setYear] = useState('');
  const [condition, setCondition] = useState('');
  const [rarity, setRarity] = useState('');
  const [language, setLanguage] = useState('English');
  const [edition, setEdition] = useState('');
  const [gradeCompany, setGradeCompany] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [storageLocation, setStorageLocation] = useState('');

  // Created item
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);

  // Handle front photo upload
  const handleFrontPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontPhotoFile(file);
      setFrontPhotoUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Handle back photo upload
  const handleBackPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackPhotoFile(file);
      setBackPhotoUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Analyze photos with Claude Vision
  const handleAnalyzePhoto = async () => {
    if (!frontPhotoUrl) {
      setError('Please select at least the front photo');
      return;
    }

    setLoading(true);
    setError(null);

    // For MVP, analyze front photo. In production, send both front + back
    const result = await analyzeCardPhoto(frontPhotoUrl);

    if (!result.success) {
      setError(result.error || 'Failed to analyze photo');
      setLoading(false);
      return;
    }

    const suggestions = result.data as AICardSuggestions;
    setAiSuggestions(suggestions);
    setAiConfidence(suggestions.confidence || 0);

    // Populate form with suggestions
    if (suggestions.player) setPlayer(suggestions.player);
    if (suggestions.set_name) setSetName(suggestions.set_name);
    if (suggestions.card_number) setCardNumber(suggestions.card_number);
    if (suggestions.year) setYear(suggestions.year.toString());
    if (suggestions.rarity) setRarity(suggestions.rarity);
    if (suggestions.language) setLanguage(suggestions.language);
    if (suggestions.edition) setEdition(suggestions.edition);
    if (suggestions.grade_company) setGradeCompany(suggestions.grade_company);
    if (suggestions.grade_value) setGradeValue(suggestions.grade_value);
    if (suggestions.suggested_price_cents)
      setPrice((suggestions.suggested_price_cents / 100).toFixed(2));

    // Update card type based on grading
    if (suggestions.grade_company) {
      setCardType('slab');
    }

    setStep('ai-review');
    setLoading(false);
  };

  // Generate title from metadata
  const generateTitle = (): string => {
    const parts = [];
    if (player) parts.push(player);
    if (setName) parts.push(setName);
    if (cardNumber) parts.push(`#${cardNumber}`);
    if (condition && cardType === 'single') parts.push(`(${condition})`);
    if (gradeCompany && gradeValue) parts.push(`${gradeCompany} ${gradeValue}`);
    return parts.join(' ') || 'Untitled Card';
  };

  // Create inventory item
  const handleCreateItem = async () => {
    if (!price || !title) {
      setError('Title and price are required');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createInventoryItem(
      {
        type: cardType,
        title: title || generateTitle(),
        price: Math.round(parseFloat(price) * 100),
        player,
        set_name: setName,
        card_number: cardNumber,
        year: year ? parseInt(year) : undefined,
        condition: cardType === 'single' ? condition : undefined,
        rarity,
        language,
        edition,
        grade_company: cardType === 'slab' ? gradeCompany : undefined,
        grade_value: cardType === 'slab' ? gradeValue : undefined,
        quantity_on_hand: parseInt(quantity) || 1,
        storage_location: storageLocation,
        photos: [frontPhotoUrl, backPhotoUrl].filter(Boolean) as string[],
      },
      'admin-user' // TODO: get actual user ID
    );

    if (!result.success) {
      setError(result.error || 'Failed to create item');
      setLoading(false);
      return;
    }

    setCreatedItemId(result.data?.id);
    setStep('confirm');
    setLoading(false);
  };

  // Publish item
  const handlePublish = async () => {
    if (!createdItemId) return;

    setLoading(true);
    setError(null);

    const result = await publishInventoryItem(createdItemId, 'admin-user');

    if (!result.success) {
      setError(result.error || 'Failed to publish item');
      setLoading(false);
      return;
    }

    setStep('success');
    setLoading(false);
  };

  // Upload step
  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <p className="text-gray-400 text-sm">Upload card photos. Front is required; back is recommended for accuracy.</p>

        {/* Front Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Front Photo *</label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
            {frontPhotoUrl ? (
              <div>
                <img
                  src={frontPhotoUrl}
                  alt="Front preview"
                  className="max-h-64 mx-auto mb-4 rounded"
                />
                <button
                  onClick={() => {
                    setFrontPhotoFile(null);
                    setFrontPhotoUrl(null);
                  }}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-4">Front of card</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFrontPhotoSelect}
                  className="hidden"
                  id="front-photo"
                />
                <label
                  htmlFor="front-photo"
                  className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                >
                  Select Front
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Back Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Back Photo (Optional)</label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
            {backPhotoUrl ? (
              <div>
                <img
                  src={backPhotoUrl}
                  alt="Back preview"
                  className="max-h-64 mx-auto mb-4 rounded"
                />
                <button
                  onClick={() => {
                    setBackPhotoFile(null);
                    setBackPhotoUrl(null);
                  }}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-4">Back of card (helps AI identify stats & card #)</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackPhotoSelect}
                  className="hidden"
                  id="back-photo"
                />
                <label
                  htmlFor="back-photo"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                >
                  Select Back
                </label>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={handleAnalyzePhoto}
          disabled={!frontPhotoUrl || loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          {loading ? 'Analyzing...' : 'Analyze with AI'}
        </Button>
      </div>
    );
  }

  // AI Review step
  if (step === 'ai-review') {
    return (
      <div className="space-y-6">
        <div className="bg-blue-900/20 border border-blue-700 p-4 rounded">
          <p className="text-blue-300 text-sm">
            ✨ AI Confidence: {aiConfidence}%
            <br />
            Review the suggestions below. Edit any fields as needed. Condition must be set
            manually for raw cards.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          {frontPhotoUrl && (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Front</p>
              <img src={frontPhotoUrl} alt="Front" className="max-h-48 rounded" />
            </div>
          )}
          {backPhotoUrl && (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Back</p>
              <img src={backPhotoUrl} alt="Back" className="max-h-48 rounded" />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Card Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value as CardType)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="single">Single (Raw)</option>
              <option value="slab">Slab (Graded)</option>
              <option value="sealed">Sealed</option>
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price ($)</label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="19.99"
            />
          </div>

          {/* Player */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Player/Character</label>
            <Input
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              placeholder="e.g., Tom Brady"
            />
          </div>

          {/* Set */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Set / Series</label>
            <Input
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g., Base Set"
            />
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Card Number</label>
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="e.g., 102/102"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
            />
          </div>

          {/* Condition (for singles only) */}
          {cardType === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="">-- Select Condition --</option>
                <option value="Mint">Mint</option>
                <option value="Near Mint">Near Mint</option>
                <option value="Lightly Played">Lightly Played</option>
                <option value="Moderately Played">Moderately Played</option>
                <option value="Heavily Played">Heavily Played</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          )}

          {/* Grade Company (for slabs) */}
          {cardType === 'slab' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Grade Company</label>
              <Input
                value={gradeCompany}
                onChange={(e) => setGradeCompany(e.target.value)}
                placeholder="PSA, BGS, CGC"
              />
            </div>
          )}

          {/* Grade Value (for slabs) */}
          {cardType === 'slab' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Grade Value</label>
              <Input
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                placeholder="e.g., 9, 10, 8.5"
              />
            </div>
          )}

          {/* Rarity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rarity</label>
            <Input
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              placeholder="Common, Rare, etc."
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="English, Japanese"
            />
          </div>

          {/* Edition */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Edition</label>
            <Input
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              placeholder="1st Edition, Unlimited"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>

          {/* Storage Location */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Storage Location</label>
            <Input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g., Shelf A, Box 3"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setStep('upload')}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleCreateItem}
            disabled={loading || (cardType === 'single' && !condition)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Creating...' : 'Create Item (Draft)'}
          </Button>
        </div>
      </div>
    );
  }

  // Confirm step
  if (step === 'confirm') {
    return (
      <div className="space-y-6">
        <div className="bg-green-900/20 border border-green-700 p-4 rounded">
          <p className="text-green-300">✓ Item created as DRAFT</p>
          <p className="text-sm text-gray-400 mt-2">
            Review below and click "Publish" to make it live on the storefront.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          {frontPhotoUrl && (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Front</p>
              <img src={frontPhotoUrl} alt="Front" className="max-h-48 rounded" />
            </div>
          )}
          {backPhotoUrl && (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Back</p>
              <img src={backPhotoUrl} alt="Back" className="max-h-48 rounded" />
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-700 p-4 rounded space-y-2 text-sm">
          <p><strong>Type:</strong> {cardType}</p>
          <p><strong>Title:</strong> {title || generateTitle()}</p>
          <p><strong>Price:</strong> ${price}</p>
          {player && <p><strong>Player:</strong> {player}</p>}
          {setName && <p><strong>Set:</strong> {setName}</p>}
          {condition && <p><strong>Condition:</strong> {condition}</p>}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setStep('ai-review')}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handlePublish}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Publishing...' : 'Publish to Storefront'}
          </Button>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">✨</div>
        <h2 className="text-2xl font-bold text-white">Card Listed!</h2>
        <p className="text-gray-400">Your item is now live on the storefront.</p>

        <div className="bg-gray-900 border border-gray-700 p-4 rounded">
          <p className="text-sm text-gray-300">Item ID: {createdItemId}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setStep('upload');
              setFrontPhotoFile(null);
              setFrontPhotoUrl(null);
              setBackPhotoFile(null);
              setBackPhotoUrl(null);
              setAiSuggestions(null);
              setTitle('');
              setPrice('');
              setPlayer('');
              setSetName('');
              setCreatedItemId(null);
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Upload Another
          </Button>
          <Button variant="outline" className="flex-1">
            View Inventory
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
