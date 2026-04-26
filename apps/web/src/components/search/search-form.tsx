'use client';

import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { SearchParams } from '@/lib/api/matching';
import { useT } from '@/i18n';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isPending?: boolean;
}

export function SearchForm({ onSearch, isPending }: SearchFormProps) {
  const { register, handleSubmit } = useForm<SearchParams>();
  const t = useT();

  return (
    <form onSubmit={handleSubmit(onSearch)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">{t('search.nameField')}</Label>
          <Input id="name" {...register('name')} placeholder="Ex: Mbarga" />
        </div>
        <div>
          <Label htmlFor="birthYear">{t('search.birthYearField')}</Label>
          <Input id="birthYear" type="number" {...register('birthYear', { valueAsNumber: true })} placeholder="Ex: 1965" />
        </div>
        <div>
          <Label htmlFor="village">{t('search.villageField')}</Label>
          <Input id="village" {...register('village')} placeholder="Ex: Bandjoun" />
        </div>
        <div>
          <Label htmlFor="parentName">{t('search.parentNameField')}</Label>
          <Input id="parentName" {...register('parentName')} placeholder="Ex: Pierre Mbarga" />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" />
        {isPending ? t('common.loading') : t('search.searchButton')}
      </Button>
    </form>
  );
}
