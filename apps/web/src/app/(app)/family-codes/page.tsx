'use client';

import { PageHeader } from '@/components/shared/page-header';
import { CreateCodeForm } from '@/components/family-codes/create-code-form';
import { CodeList } from '@/components/family-codes/code-list';
import { RedeemForm } from '@/components/family-codes/redeem-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KeyRound, Plus, LogIn } from 'lucide-react';

export default function FamilyCodesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Codes famille" />

      <Card className="border-forest/20 bg-forest/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
          <div className="space-y-1 text-sm text-charcoal/80">
            <p className="font-medium text-charcoal">Codes famille</p>
            <p>
              Genere un code court (ex. MBALLA-2847) et partage-le a ta famille
              (oral, papier, SMS, WhatsApp). Quand un proche le saisit ici, il
              rejoint ton arbre directement.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="gap-2">
            <Plus className="h-4 w-4" />
            Generer
          </TabsTrigger>
          <TabsTrigger value="redeem" className="gap-2">
            <LogIn className="h-4 w-4" />
            Rejoindre une famille
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generer un nouveau code</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateCodeForm />
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-charcoal">Mes codes</h2>
            <CodeList />
          </div>
        </TabsContent>

        <TabsContent value="redeem">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saisir un code</CardTitle>
            </CardHeader>
            <CardContent>
              <RedeemForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
