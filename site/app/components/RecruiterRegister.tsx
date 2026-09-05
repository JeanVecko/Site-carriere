"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle, ArrowLeft, Download } from "lucide-react";

const secteurs = [
  "Banque / Finance",
  "BTP / Construction",
  "Commerce / Distribution",
  "Éducation / Formation",
  "Énergie / Mines",
  "Hôtellerie / Restauration",
  "Industrie / Manufacture",
  "Informatique / Télécoms",
  "NGO / Coopération",
  "Santé / Pharmacie",
  "Services / Conseil",
  "Transport / Logistique",
  "Autre",
];

const pays = [
  "République Démocratique du Congo",
  "Congo-Brazzaville",
  "Angola",
  "Cameroun",
  "Gabon",
  "Kenya",
  "Maroc",
  "France",
  "Belgique",
  "Canada",
  "États-Unis",
  "Autre",
];

const tranches = [
  "1 - 10 employés",
  "11 - 50 employés",
  "51 - 200 employés",
  "201 - 500 employés",
  "Plus de 500 employés",
];

export default function RecruiterRegister() {
  // Section 1 : Informations de l'entreprise
  const [companyName, setCompanyName] = useState("");
  const [adresse, setAdresse] = useState("");
  const [secteur, setSecteur] = useState("");
  const [description, setDescription] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("");
  const [tranche, setTranche] = useState("");
  const [siteWeb, setSiteWeb] = useState("");

  // Section 2 : Coordonnées de contact
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [indicatif1, setIndicatif1] = useState("+243");
  const [tel1, setTel1] = useState("");
  const [indicatif2, setIndicatif2] = useState("+243");
  const [tel2, setTel2] = useState("");

  // Section 3 : Identifiants
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fichiers
  const [logoName, setLogoName] = useState("");
  const [registreName, setRegistreName] = useState("");

  // Autres
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isCaptchaChecking, setIsCaptchaChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COMPANY_NAME_MAX = 50;

  function handleCaptchaClick() {
    if (isCaptchaVerified || isCaptchaChecking) return;
    setIsCaptchaChecking(true);
    setTimeout(() => {
      setIsCaptchaChecking(false);
      setIsCaptchaVerified(true);
      if (feedback?.message.includes("robot")) {
        setFeedback(null);
      }
    }, 750);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    if (!companyName || !adresse || !secteur || !description || !ville || !pays || !tranche) {
      setFeedback({ type: "error", message: "Veuillez renseigner tous les champs obligatoires (*)." });
      return;
    }

    if (!civilite || !prenom || !nom || !fonction || !tel1) {
      setFeedback({ type: "error", message: "Veuillez renseigner vos coordonnées de contact (*)." });
      return;
    }

    if (!/^[0-9\s-]{6,15}$/.test(tel1.trim())) {
      setFeedback({ type: "error", message: "Veuillez saisir un numéro de téléphone principal valide." });
      return;
    }

    if (tel2 && !/^[0-9\s-]{6,15}$/.test(tel2.trim())) {
      setFeedback({ type: "error", message: "Veuillez saisir un numéro de téléphone secondaire valide." });
      return;
    }

    if (!email || !confirmEmail || !password) {
      setFeedback({ type: "error", message: "Veuillez renseigner vos identifiants (*)." });
      return;
    }

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      setFeedback({ type: "error", message: "Les adresses e-mail ne correspondent pas. Veuillez vérifier votre saisie." });
      return;
    }

    if (password.length < 6) {
      setFeedback({ type: "error", message: "Le mot de passe doit comporter au moins 6 caractères." });
      return;
    }

    if (!acceptedTerms) {
      setFeedback({ type: "error", message: "Vous devez accepter les Conditions Générales de Vente et d'Utilisation pour continuer." });
      return;
    }

    if (!isCaptchaVerified) {
      setFeedback({ type: "error", message: "Veuillez confirmer que vous n'êtes pas un robot avant de continuer." });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFeedback({
        type: "success",
        message: "Félicitations ! Votre compte Recruteur a été créé. Un e-mail de confirmation vous a été envoyé.",
      });
    }, 900);
  }
}
