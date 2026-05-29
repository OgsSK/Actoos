import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Target, Eye, Shield, Zap, Heart, TrendingUp } from 'lucide-react';

const AboutPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    {/* Hero */}
    <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">À propos d'Actoos Jobs</h1>
        <p className="text-blue-100 text-lg max-w-2xl mx-auto">
          La plateforme de recrutement nouvelle génération, conçue pour connecter les talents avec les entreprises qui recrutent, en simplifiant et modernisant le processus.
        </p>
      </div>
    </div>

    {/* Mission & Vision */}
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Notre mission</h2>
            <p className="text-slate-600 leading-relaxed">
              Simplifier le recrutement à l'échelle mondiale en offrant une expérience fluide, transparente et efficace, que vous soyez candidat ou recruteur. Nous croyons que chaque talent mérite d'être découvert.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg rounded-3xl">
          <CardContent className="p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Notre vision</h2>
            <p className="text-slate-600 leading-relaxed">
              Devenir la référence en matière de recrutement à l'international, en utilisant la technologie et l'intelligence artificielle pour créer des connexions professionnelles durables et équitables.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Valeurs */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Nos valeurs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Shield, title: 'Transparence', desc: 'Publiez et postulez en toute confiance.' },
            { icon: Zap, title: 'Innovation', desc: 'Des outils intelligents pour un recrutement moderne.' },
            { icon: Heart, title: 'Proximité', desc: 'Un support local, à votre écoute.' },
            { icon: TrendingUp, title: 'Performance', desc: 'Maximisez vos chances de trouver le bon match.' },
          ].map((v) => (
            <Card key={v.title} className="border-0 shadow-lg rounded-3xl text-center">
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-slate-600">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* L'équipe */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">L'équipe Actoos</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Fondée par une équipe d'ingénieurs passionnés, Actoos Jobs est développé avec soin pour répondre aux besoins réels du marché de l'emploi. Nous combinons expertise technique et connaissance du terrain pour offrir un service fiable et innovant.
        </p>
      </div>
    </div>
  </div>
);

export default AboutPage;
