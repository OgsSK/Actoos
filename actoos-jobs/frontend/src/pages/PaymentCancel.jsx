import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { XCircle, ArrowRight } from 'lucide-react';

const PaymentCancel = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 text-white to-[#16213e] pt-20 p-4">
      <Card className="max-w-lg w-full bg-white/10 backdrop-blur-xl border-white/20 rounded-4xl text-center p-10">
        <CardContent className="space-y-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('paymentCancel.title')}</h1>
          <p className="text-blue-200">
            {t('paymentCancel.message')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/tarifs">
              <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl">
                {t('paymentCancel.retry')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-2xl">
                {t('paymentCancel.backHome')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;