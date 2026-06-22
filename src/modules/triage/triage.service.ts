import { Injectable } from '@nestjs/common';

@Injectable()
export class TriageService {
  analyzeSymptoms(symptoms: string[]): any {
    const specialties = {
      cardiology: ['chest pain', 'palpitations', 'shortness of breath'],
      dermatology: ['rash', 'acne', 'skin', 'itch'],
      orthopedics: ['joint pain', 'bone', 'fracture'],
    };

    for (const [specialty, keywords] of Object.entries(specialties)) {
      if (symptoms.some(s => keywords.some(k => s.toLowerCase().includes(k)))) {
        return { recommended_specialty: specialty, confidence: 0.8 };
      }
    }
    return { recommended_specialty: 'general_medicine', confidence: 0.5 };
  }
}
