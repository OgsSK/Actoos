import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AIAssistant from '../components/AIAssistant';
import { toast } from 'sonner';
import {
  User, Briefcase, FileText, GraduationCap, Award,
  MapPin, Globe, Plus, X, Save, Loader2,
  Upload, Trash2, ChevronLeft, Check, Calendar, Building2, Link
} from 'lucide-react';
import { cn, EXPERIENCE_LEVELS } from '../lib/utils';

// Section Header Component
const SectionHeader = ({ icon: Icon, title, description, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Skill Badge Component
const SkillBadge = ({ skill, onRemove }) => (
  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1">
    {skill}
    <button
      onClick={() => onRemove(skill)}
      className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </Badge>
);

// Experience Item Component
const ExperienceItem = ({ experience, onEdit, onRemove }) => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
          <Building2 className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{experience.title}</h3>
          <p className="text-sm text-slate-600">{experience.company}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {experience.start_date} - {experience.end_date || 'Présent'}
            </span>
            {experience.location && (
              <>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5" />
                <span>{experience.location}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(experience)}>
          Modifier
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => onRemove(experience.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
    {experience.description && (
      <p className="text-sm text-slate-600 mt-3 pl-15">{experience.description}</p>
    )}
  </div>
);

// Education Item Component
const EducationItem = ({ education, onEdit, onRemove }) => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
          <GraduationCap className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{education.degree}</h3>
          <p className="text-sm text-slate-600">{education.school}</p>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{education.year}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(education)}>
          Modifier
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => onRemove(education.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);

// Add Experience Modal
const ExperienceModal = ({ isOpen, onClose, onSave, experience = null }) => {
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    start_date: '',
    end_date: '',
    current: false,
    description: '',
  });

  useEffect(() => {
    if (experience) {
      setForm(experience);
    } else {
      setForm({
        title: '',
        company: '',
        location: '',
        start_date: '',
        end_date: '',
        current: false,
        description: '',
      });
    }
  }, [experience, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            {experience ? 'Modifier l\'expérience' : 'Ajouter une expérience'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Poste *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Développeur Full Stack"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise *</label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Ex: Orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ex: Bruxelles, Belgique"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de début *</label>
              <Input
                type="month"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
              <Input
                type="month"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                disabled={form.current}
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.checked, end_date: '' })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">J'occupe actuellement ce poste</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Décrivez vos missions et réalisations..."
            />
            <div className="mt-2">
              <AIAssistant
                agentId="cv-experience"
                initialText={form.description}
                context={`${form.title} chez ${form.company}`}
                onApply={(newDesc) => setForm({ ...form, description: newDesc })}
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title || !form.company || !form.start_date}>
            {experience ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Add Education Modal
const EducationModal = ({ isOpen, onClose, onSave, education = null }) => {
  const [form, setForm] = useState({
    degree: '',
    school: '',
    field: '',
    year: '',
  });

  useEffect(() => {
    if (education) {
      setForm(education);
    } else {
      setForm({ degree: '', school: '', field: '', year: '' });
    }
  }, [education, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            {education ? 'Modifier la formation' : 'Ajouter une formation'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Diplôme *</label>
            <Input
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              placeholder="Ex: Master en Informatique"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Établissement *</label>
            <Input
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              placeholder="Ex: Université Libre de Bruxelles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Domaine d'études</label>
            <Input
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value })}
              placeholder="Ex: Génie Logiciel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Année d'obtention *</label>
            <Input
              type="number"
              min="1950"
              max={new Date().getFullYear()}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="Ex: 2023"
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(form)} disabled={!form.degree || !form.school || !form.year}>
            {education ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Profile Page
const CandidateProfilePage = () => {
  const { user, profile, updateProfile, updateCandidateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [saving, setSaving] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [cities, setCities] = useState([]);
  
  // Form state
  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city_id: '',
  });
  
  const [candidateInfo, setCandidateInfo] = useState({
    title: '',
    bio: '',
    experience_level: '',
    years_of_experience: 0,
    is_available: true,
    is_open_to_remote: false,
    linkedin_url: '',
    portfolio_url: '',
    desired_salary_min: '',
    desired_salary_max: '',
  });
  
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  
  // Modal states
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState(null);

  // Load cities
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setCities(data || []);
    };
    fetchCities();
  }, []);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setPersonalInfo({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        city_id: profile.city_id || '',
      });
      
      if (profile.candidate_profile) {
        const cp = profile.candidate_profile;
        setCandidateInfo({
          title: cp.title || '',
          bio: cp.bio || '',
          experience_level: cp.experience_level || '',
          years_of_experience: cp.years_of_experience || 0,
          is_available: cp.is_available ?? true,
          is_open_to_remote: cp.is_open_to_remote || false,
          linkedin_url: cp.linkedin_url || '',
          portfolio_url: cp.portfolio_url || '',
          desired_salary_min: cp.desired_salary_min || '',
          desired_salary_max: cp.desired_salary_max || '',
        });
        setSkills(cp.skills || []);
        setExperiences(cp.experience || []);
        setEducation(cp.education || []);
      }
    }
  }, [profile]);

  // Add skill
  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // Save experience
  const handleSaveExperience = (exp) => {
    if (editingExp) {
      setExperiences(experiences.map(e => e.id === editingExp.id ? { ...exp, id: editingExp.id } : e));
    } else {
      setExperiences([...experiences, { ...exp, id: Date.now().toString() }]);
    }
    setShowExpModal(false);
    setEditingExp(null);
  };

  // Remove experience
  const handleRemoveExperience = (id) => {
    setExperiences(experiences.filter(e => e.id !== id));
  };

  // Save education
  const handleSaveEducation = (edu) => {
    if (editingEdu) {
      setEducation(education.map(e => e.id === editingEdu.id ? { ...edu, id: editingEdu.id } : e));
    } else {
      setEducation([...education, { ...edu, id: Date.now().toString() }]);
    }
    setShowEduModal(false);
    setEditingEdu(null);
  };

  // Remove education
  const handleRemoveEducation = (id) => {
    setEducation(education.filter(e => e.id !== id));
  };

  // Delete CV
  const handleDeleteCV = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre CV ?')) return;
    
    setUploadingCV(true);
    try {
      const cvUrl = profile?.candidate_profile?.cv_url;
      if (cvUrl) {
        const urlParts = cvUrl.split('/cvs/');
        if (urlParts[1]) {
          await supabase.storage
            .from('cvs')
            .remove([urlParts[1]]);
        }
      }
      
      await updateCandidateProfile({ cv_url: null });
      toast.success('CV supprimé avec succès');
      await refreshProfile();
    } catch (error) {
      console.error('Error deleting CV:', error);
      toast.error('Erreur lors de la suppression du CV');
    } finally {
      setUploadingCV(false);
    }
  };

  // Upload CV
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PDF ou Word.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    setUploadingCV(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cv-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cvs')
        .getPublicUrl(fileName);

      await updateCandidateProfile({ cv_url: urlData.publicUrl });
      toast.success('CV téléchargé avec succès !');
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast.error('Erreur lors du téléchargement du CV');
    } finally {
      setUploadingCV(false);
    }
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(personalInfo);

      await updateCandidateProfile({
        ...candidateInfo,
        skills,
        experience: experiences,
        education,
        desired_salary_min: candidateInfo.desired_salary_min ? parseInt(candidateInfo.desired_salary_min) : null,
        desired_salary_max: candidateInfo.desired_salary_max ? parseInt(candidateInfo.desired_salary_max) : null,
      });

      toast.success('Profil mis à jour avec succès !');
      await refreshProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de la sauvegarde du profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
              <p className="text-slate-600">Gérez vos informations professionnelles</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 text-white hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </Button>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card data-testid="personal-info-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={User}
                title="Informations personnelles"
                description="Vos informations de base"
              />
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                  <Input
                    value={personalInfo.first_name}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, first_name: e.target.value })}
                    placeholder="Votre prénom"
                    data-testid="first-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <Input
                    value={personalInfo.last_name}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, last_name: e.target.value })}
                    placeholder="Votre nom"
                    data-testid="last-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <Input
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    placeholder="+223 XX XX XX XX"
                    data-testid="phone-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                  <select
                    value={personalInfo.city_id}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, city_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    data-testid="city-select"
                  >
                    <option value="">Sélectionnez une ville</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Title & Bio */}
          <Card data-testid="professional-info-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={Briefcase}
                title="Profil professionnel"
                description="Votre titre et présentation"
              />
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titre professionnel *</label>
                  <Input
                    value={candidateInfo.title}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, title: e.target.value })}
                    placeholder="Ex: Développeur Full Stack, Chef de Projet IT, Comptable..."
                    data-testid="title-input"
                  />
                  <div className="mt-2">
                    <AIAssistant
                      agentId="cv-summary"
                      initialText={candidateInfo.title}
                      onApply={(newTitle) => setCandidateInfo({ ...candidateInfo, title: newTitle })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">À propos de moi</label>
                  <textarea
                    value={candidateInfo.bio}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, bio: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Présentez-vous en quelques lignes : votre parcours, vos motivations, ce que vous recherchez..."
                    data-testid="bio-textarea"
                  />
                  <div className="mt-2">
                    <AIAssistant
                      agentId="cv-summary"
                      initialText={candidateInfo.bio}
                      context={candidateInfo.title}
                      onApply={(newBio) => setCandidateInfo({ ...candidateInfo, bio: newBio })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Niveau d'expérience</label>
                    <select
                      value={candidateInfo.experience_level}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, experience_level: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      data-testid="experience-level-select"
                    >
                      <option value="">Sélectionnez</option>
                      {Object.entries(EXPERIENCE_LEVELS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Années d'expérience</label>
                    <Input
                      type="number"
                      min="0"
                      max="50"
                      value={candidateInfo.years_of_experience}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, years_of_experience: parseInt(e.target.value) || 0 })}
                      data-testid="years-experience-input"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candidateInfo.is_available}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, is_available: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">Je suis disponible immédiatement</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candidateInfo.is_open_to_remote}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, is_open_to_remote: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600">Ouvert au télétravail</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CV Upload */}
          <Card data-testid="cv-upload-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={FileText}
                title="Mon CV"
                description="Téléchargez votre CV au format PDF ou Word"
              />
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                {profile?.candidate_profile?.cv_url ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">CV téléchargé</p>
                      <a
                        href={profile.candidate_profile.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                        data-testid="view-cv-link"
                      >
                        Voir mon CV
                      </a>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingCV} data-testid="replace-cv-btn">
                        {uploadingCV ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Remplacer
                      </Button>
                      <Button variant="outline" onClick={handleDeleteCV} disabled={uploadingCV} className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="delete-cv-btn">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Téléchargez votre CV</p>
                      <p className="text-sm text-slate-500">PDF ou Word, max 5MB</p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingCV}>
                      {uploadingCV ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Choisir un fichier
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  data-testid="cv-file-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card data-testid="skills-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={Award}
                title="Compétences"
                description="Ajoutez vos compétences clés"
              />
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Ex: React, Python, Gestion de projet..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    data-testid="skill-input"
                  />
                  <Button onClick={handleAddSkill} disabled={!newSkill.trim()} data-testid="add-skill-btn">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <SkillBadge key={skill} skill={skill} onRemove={handleRemoveSkill} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Aucune compétence ajoutée. Commencez à ajouter vos compétences !
                  </p>
                )}
                <div className="mt-2">
                  <AIAssistant
                    agentId="cv-skills"
                    initialText={candidateInfo.bio}
                    onApply={(generatedSkills) => {
                      // Parse compétences générées (séparées par des virgules ou puces)
                      const skillsArray = generatedSkills
                        .split(/[•,,\n-]/)
                        .map(s => s.trim())
                        .filter(s => s.length > 0 && !skills.includes(s));
                      if (skillsArray.length > 0) {
                        setSkills([...skills, ...skillsArray]);
                        toast.success(`${skillsArray.length} compétence(s) ajoutée(s) !`);
                      } else {
                        toast.info('Aucune nouvelle compétence trouvée.');
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card data-testid="experience-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={Briefcase}
                title="Expériences professionnelles"
                description="Votre parcours professionnel"
                action={
                  <Button variant="outline" size="sm" onClick={() => { setEditingExp(null); setShowExpModal(true); }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                }
              />
              
              {experiences.length > 0 ? (
                <div className="space-y-4">
                  {experiences.map((exp) => (
                    <ExperienceItem
                      key={exp.id}
                      experience={exp}
                      onEdit={(e) => { setEditingExp(e); setShowExpModal(true); }}
                      onRemove={handleRemoveExperience}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Aucune expérience ajoutée</p>
                  <p className="text-sm">Cliquez sur "Ajouter" pour ajouter votre première expérience</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card data-testid="education-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={GraduationCap}
                title="Formation"
                description="Vos diplômes et certifications"
                action={
                  <Button variant="outline" size="sm" onClick={() => { setEditingEdu(null); setShowEduModal(true); }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                }
              />
              
              {education.length > 0 ? (
                <div className="space-y-4">
                  {education.map((edu) => (
                    <EducationItem
                      key={edu.id}
                      education={edu}
                      onEdit={(e) => { setEditingEdu(e); setShowEduModal(true); }}
                      onRemove={handleRemoveEducation}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Aucune formation ajoutée</p>
                  <p className="text-sm">Cliquez sur "Ajouter" pour ajouter votre première formation</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card data-testid="links-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={Globe}
                title="Liens"
                description="Portfolio et réseaux sociaux"
              />
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Link className="w-4 h-4 inline mr-1" />
                    LinkedIn
                  </label>
                  <Input
                    value={candidateInfo.linkedin_url}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/votre-profil"
                    data-testid="linkedin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Portfolio / Site web
                  </label>
                  <Input
                    value={candidateInfo.portfolio_url}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, portfolio_url: e.target.value })}
                    placeholder="https://votre-portfolio.com"
                    data-testid="portfolio-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Expectations */}
          <Card data-testid="salary-card">
            <CardContent className="p-6">
              <SectionHeader
                icon={Briefcase}
                title="Prétentions salariales"
                description="Fourchette de salaire souhaitée (FCFA/mois)"
              />
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire minimum</label>
                  <Input
                    type="number"
                    value={candidateInfo.desired_salary_min}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, desired_salary_min: e.target.value })}
                    placeholder="Ex: 300000"
                    data-testid="salary-min-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire maximum</label>
                  <Input
                    type="number"
                    value={candidateInfo.desired_salary_max}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, desired_salary_max: e.target.value })}
                    placeholder="Ex: 500000"
                    data-testid="salary-max-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2 bg-blue-600 text-white hover:bg-blue-700 text-white" data-testid="save-profile-btn">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExperienceModal
        isOpen={showExpModal}
        onClose={() => { setShowExpModal(false); setEditingExp(null); }}
        onSave={handleSaveExperience}
        experience={editingExp}
      />
      <EducationModal
        isOpen={showEduModal}
        onClose={() => { setShowEduModal(false); setEditingEdu(null); }}
        onSave={handleSaveEducation}
        education={editingEdu}
      />
    </div>
  );
};

export default CandidateProfilePage;