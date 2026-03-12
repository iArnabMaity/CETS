import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, Mail, Phone, X, Save } from 'lucide-react';

export default function MyProfile({ employeeId }) {
  // Mocking the initial fetch payload for visual testing
  const [profile, setProfile] = useState({
    name: "Arnab Maity",
    email: "arnab@example.com",
    phone: "+91 9876543210",
    dob: "1997-05-17",
    emailVerified: false,
    phoneVerified: false,
    about: "Passionate about AI, Machine Learning, and building secure, full-stack ecosystems.",
    skills: ["Python", "React", "MongoDB", "FastAPI"],
    languages: ["English", "Bengali", "Hindi"],
    hobbies: ["Photography", "Football"]
  });

  const [newSkill, setNewSkill] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [newHobby, setNewHobby] = useState("");

  const handleAddTag = (field, value, maxLimit) => {
    if (value.trim() !== "" && profile[field].length < maxLimit && !profile[field].includes(value)) {
      setProfile({ ...profile, [field]: [...profile[field], value.trim()] });
    }
  };

  const handleRemoveTag = (field, tagToRemove) => {
    setProfile({ ...profile, [field]: profile[field].filter(tag => tag !== tagToRemove) });
  };

  const handleSave = async () => {
    // This will hit your new Pydantic-secured FastAPI endpoint
    console.log("Saving payload:", profile);
    // await fetch('/api/profile/customize/...', { method: 'PUT', body: JSON.stringify(profile) })
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* TOP HEADER & TRUST BADGE */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{profile.name}</h1>
            {profile.emailVerified && profile.phoneVerified && (
              <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 px-2 py-1">
                <ShieldCheck size={14} /> Verified User
              </Badge>
            )}
          </div>
          <p className="text-slate-500">Master of Computer Applications • Adamas University</p>
        </div>
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
          <Save size={18} /> Save Profile
        </Button>
      </div>

      {/* VERIFICATION & ANALYTICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Contact & Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
                <Mail size={16} /> <span>{profile.email}</span>
              </div>
              {!profile.emailVerified ? (
                <Button variant="outline" size="sm" className="text-xs">Verify</Button>
              ) : (
                <CheckCircle2 size={18} className="text-emerald-500" />
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
                <Phone size={16} /> <span>{profile.phone}</span>
              </div>
              {!profile.phoneVerified ? (
                <Button variant="outline" size="sm" className="text-xs">Verify</Button>
              ) : (
                <CheckCircle2 size={18} className="text-emerald-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* MOCK ANALYTICS CARDS */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <p className="text-sm text-slate-500 font-medium mb-1">Average Tenure</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">2.4 <span className="text-lg font-normal text-slate-500">Years</span></h3>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2 font-medium">Stable Professional</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <p className="text-sm text-slate-500 font-medium mb-1">Academic Standing</p>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">84.5% <span className="text-lg font-normal text-slate-500">(A)</span></h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-medium">Excellent</p>
          </CardContent>
        </Card>
      </div>

      {/* ABOUT ME SECTION */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">About Me</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
            rows="4"
            value={profile.about}
            onChange={(e) => setProfile({ ...profile, about: e.target.value })}
            maxLength={500}
            placeholder="Write a brief professional summary..."
          />
          <div className="flex justify-end mt-2">
            <span className={`text-xs ${profile.about.length > 480 ? 'text-red-500' : 'text-slate-400'}`}>
              {profile.about.length} / 500 characters
            </span>
          </div>
        </CardContent>
      </Card>

      {/* DYNAMIC TAG ARRAYS (SKILLS, LANGUAGES, HOBBIES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SKILLS (Max 20) */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 flex flex-row justify-between items-center">
            <CardTitle className="text-sm">Skills</CardTitle>
            <span className="text-xs text-slate-400">{profile.skills.length}/20</span>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.skills.map(skill => (
                <Badge key={skill} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                  {skill}
                  <button onClick={() => handleRemoveTag('skills', skill)} className="hover:text-red-500"><X size={14}/></button>
                </Badge>
              ))}
            </div>
            <input 
              type="text" 
              className="w-full text-sm p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50"
              placeholder={profile.skills.length >= 20 ? "Limit reached" : "Add a skill & press Enter"}
              disabled={profile.skills.length >= 20}
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') { handleAddTag('skills', newSkill, 20); setNewSkill(""); } }}
            />
          </CardContent>
        </Card>

        {/* LANGUAGES (Max 10) */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 flex flex-row justify-between items-center">
            <CardTitle className="text-sm">Languages</CardTitle>
            <span className="text-xs text-slate-400">{profile.languages.length}/10</span>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.languages.map(lang => (
                <Badge key={lang} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100">
                  {lang}
                  <button onClick={() => handleRemoveTag('languages', lang)} className="hover:text-red-500"><X size={14}/></button>
                </Badge>
              ))}
            </div>
            <input 
              type="text" 
              className="w-full text-sm p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-transparent focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
              placeholder={profile.languages.length >= 10 ? "Limit reached" : "Add a language..."}
              disabled={profile.languages.length >= 10}
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') { handleAddTag('languages', newLanguage, 10); setNewLanguage(""); } }}
            />
          </CardContent>
        </Card>

        {/* HOBBIES (Max 5) */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 flex flex-row justify-between items-center">
            <CardTitle className="text-sm">Hobbies</CardTitle>
            <span className="text-xs text-slate-400">{profile.hobbies.length}/5</span>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.hobbies.map(hobby => (
                <Badge key={hobby} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 hover:bg-purple-100">
                  {hobby}
                  <button onClick={() => handleRemoveTag('hobbies', hobby)} className="hover:text-red-500"><X size={14}/></button>
                </Badge>
              ))}
            </div>
            <input 
              type="text" 
              className="w-full text-sm p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-transparent focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50"
              placeholder={profile.hobbies.length >= 5 ? "Limit reached" : "Add a hobby..."}
              disabled={profile.hobbies.length >= 5}
              value={newHobby}
              onChange={(e) => setNewHobby(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') { handleAddTag('hobbies', newHobby, 5); setNewHobby(""); } }}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}