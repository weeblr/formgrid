import type { Messages } from './en';

// [weeblr] French texts. Same keys as en.ts; an empty text falls back to English.
//   is the non-breaking space French puts before "!" and inside « ».

export const fr: Messages = {
    'page.success.title': 'Formulaire envoyé',
    'page.success.heading': 'Merci !',
    'page.success.message': 'Votre formulaire a bien été envoyé.',

    'page.error.title': 'Échec de l’envoi',
    'page.error.heading': 'Échec de l’envoi',
    'page.error.back': 'Retour',

    'error.form_not_found': 'Ce formulaire n’existe pas.',
    'error.form_inactive': 'Ce formulaire n’accepte pas de réponses pour le moment.',
    'error.multiple_submissions': 'Vous avez déjà envoyé ce formulaire récemment. Veuillez réessayer plus tard.',
    'error.required_field': 'Le champ « {field} » est obligatoire.',
    'error.generic': 'Une erreur s’est produite lors de l’envoi de votre formulaire. Veuillez réessayer.',

    'email.notification.subject': 'Nouvelle réponse au formulaire {form}',
    'email.notification.heading': 'Nouvelle réponse',
    'email.notification.intro': 'Une nouvelle réponse a été reçue pour le formulaire {form}.',
    'email.notification.data_heading': 'Données envoyées',
    'email.notification.details_heading': 'Détails de l’envoi',

    'email.autoreply.subject': 'Confirmation de votre envoi - {form}',
    'email.autoreply.heading': 'Merci pour votre envoi !',
    'email.autoreply.intro': 'Nous avons bien reçu votre envoi pour le formulaire {form}.',

    'email.label.form': 'Formulaire',
    'email.label.submitted_at': 'Envoyé le',
    'email.label.submission_id': 'Référence',
    'email.label.ip': 'Adresse IP',
    'email.label.field': 'Champ',
    'email.label.value': 'Valeur',

    'email.footer.automated': 'Ce message a été envoyé automatiquement. Merci de ne pas y répondre.',
    'email.footer.reply_to': 'Répondre à cet email enverra un message à l’adresse {email}.',

    'value.empty': '-',
    'value.yes': 'Oui',
    'value.no': 'Non',
};
