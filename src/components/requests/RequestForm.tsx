'use client';

import React from 'react';
import { HardwareRequestData, SoftwareRequestData, MachineShopRequestData, BatteryChargingRequestData } from '@/lib/types';
import { serializeHardwareData } from './HardwareFields';
import { serializeSoftwareData } from './SoftwareFields';
import { serializeMachineShopData } from './MachineShopFields';
import { serializeBatteryChargingData } from './BatteryChargingFields';
import { countries } from '@/data/countries';
// Note: Component imports removed as they're no longer used in this file

// Type-specific data serializers
const typeDataSerializers = {
  hardware: serializeHardwareData,
  software: serializeSoftwareData,
  machine_shop: serializeMachineShopData,
  battery_charging: serializeBatteryChargingData,
};

// Main interfaces
export interface RequestFormData {
  countryCode: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  typeSpecificData?: {
    hardware?: HardwareRequestData;
    software?: SoftwareRequestData;
    machine_shop?: MachineShopRequestData;
    battery_charging?: BatteryChargingRequestData;
  };
}

export interface RequestFormProps {
  type: 'hardware' | 'software' | 'machine_shop' | 'battery_charging';
  onSubmit: (data: RequestFormData) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}

export default function RequestForm({
  type,
  onSubmit,
  isSubmitting,
  error,
}: RequestFormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: RequestFormData = {
      countryCode: formData.get('countryCode') as string,
      description: formData.get('description') as string,
      priority: 'medium', // Default priority since removed from form
      typeSpecificData: {},
    };

    // Ensure typeSpecificData is initialized
    if (!data.typeSpecificData) {
      data.typeSpecificData = {};
    }

    // Use type-specific serializers to collect form data
    const serializer = typeDataSerializers[type];
    if (serializer) {
      data.typeSpecificData[type] = serializer(formData);
    }

    await onSubmit(data);
  };

  // Note: TypeSpecificFields commented out as it's not being used and causes TypeScript errors
  // const TypeSpecificFields: Record<RequestFormProps['type'], React.ComponentType<{ data: unknown; onChange: (data: unknown) => void }>> = {
  //   hardware: HardwareFields,
  //   software: SoftwareFields,
  //   machine_shop: MachineShopFields,
  //   battery_charging: BatteryChargingFields,
  // };

  // const SelectedTypeFields = TypeSpecificFields[type];

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Country
        </label>
        <select
          name="countryCode"
          required
          className="shadow border rounded w-full py-2 px-3 text-gray-700"
        >
          <option value="">
            Select a country
          </option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Description
        </label>
        <textarea
          name="description"
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
          rows={3}
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Priority (1-5)
        </label>
        <select
          name="priority"
          required
          className="shadow border rounded w-full py-2 px-3 text-gray-700"
        >
          <option value="1">1 - Critical (Robot cannot compete)</option>
          <option value="2">2 - Major (Significant impact)</option>
          <option value="3">3 - Important (Moderate impact)</option>
          <option value="4">4 - Minor (Small impact)</option>
          <option value="5">5 - Low (No immediate impact)</option>
        </select>
      </div>

      {/* <SelectedTypeFields type={type} /> */}
      {/* Type-specific fields have been moved to the page components */}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}