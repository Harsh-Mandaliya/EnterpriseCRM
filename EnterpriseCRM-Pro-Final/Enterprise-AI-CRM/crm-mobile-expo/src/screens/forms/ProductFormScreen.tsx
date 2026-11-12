import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createProduct, updateProduct } from '@/api/products.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { InputField, StepperField, SwitchField } from '@/components/form/fields';
import { parseMoney, rules, useForm } from '@/hooks/useForm';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ProductForm'>;

type Values = {
  name: string;
  sku: string;
  category: string;
  description: string;
  price: string;
  stockQty: number;
  isActive: boolean;
};

/** Create / edit a product or service in the catalogue. */
export function ProductFormScreen({ navigation, route }: Props) {
  const editing = route.params?.product ?? null;

  const form = useForm<Values>(
    {
      name: editing?.name ?? '',
      sku: editing?.sku ?? '',
      category: editing?.category ?? '',
      description: editing?.description ?? '',
      price: editing ? String(editing.price) : '',
      stockQty: editing?.stockQty ?? 0,
      isActive: editing?.isActive ?? true,
    },
    {
      name: rules.minLength('Name', 1),
      price: rules.money('Price', { required: true }),
    },
  );
  const { values, setField } = form;

  const submit = form.handleSubmit(async v => {
    const payload = {
      name: v.name.trim(),
      sku: v.sku.trim() || undefined,
      category: v.category.trim() || undefined,
      description: v.description.trim() || undefined,
      price: parseMoney(v.price),
      stockQty: v.stockQty,
    };
    if (editing) {
      await updateProduct(editing.id, { ...payload, isActive: v.isActive });
    } else {
      await createProduct(payload);
    }
    navigation.goBack();
  }, `Couldn't ${editing ? 'update' : 'create'} the product.`);

  return (
    <FormScreen
      title={editing ? 'Edit product' : 'New product'}
      subtitle={editing ? editing.name : 'Add an item you sell'}
      icon="cube-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={editing ? 'Save product' : 'Add product'}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Basics" icon="cube-outline">
        <InputField label="Name" required icon="pricetag-outline" value={values.name} onChangeText={v => setField('name', v)} onBlur={() => form.touch('name')} error={form.errorFor('name')} placeholder="e.g. Premium cotton fabric" />
        <InputField label="SKU / code" icon="barcode-outline" value={values.sku} onChangeText={v => setField('sku', v)} autoCapitalize="characters" placeholder="Optional" />
        <InputField label="Category" icon="folder-outline" value={values.category} onChangeText={v => setField('category', v)} autoCapitalize="words" placeholder="e.g. Textiles" />
        <InputField label="Description" value={values.description} onChangeText={v => setField('description', v)} multiline placeholder="Shown on invoices when you pick this product" />
      </FormSection>

      <FormSection title="Price & stock" icon="cash-outline">
        <InputField label="Unit price" required prefix="₹" value={values.price} onChangeText={v => setField('price', v)} onBlur={() => form.touch('price')} keyboardType="decimal-pad" error={form.errorFor('price')} placeholder="0" hint="Before tax. Tax is added on the invoice." />
        <StepperField label="In stock" value={values.stockQty} onChange={v => setField('stockQty', v)} />
        {editing ? (
          <SwitchField
            label="Available for sale"
            description="Inactive products are hidden from new invoices."
            value={values.isActive}
            onChange={v => setField('isActive', v)}
          />
        ) : null}
      </FormSection>
    </FormScreen>
  );
}
