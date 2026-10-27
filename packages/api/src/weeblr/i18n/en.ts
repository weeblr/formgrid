// [weeblr] English texts shown to form visitors and in submission emails.
// Every other language file has the same keys; an empty text falls back to English.
// Placeholders such as {form} are replaced when the text is used.

export const en = {
    'page.success.title': 'Form submitted',
    'page.success.heading': 'Thank you!',
    'page.success.message': 'Your form has been submitted successfully.',

    'page.error.title': 'Submission failed',
    'page.error.heading': 'Submission failed',
    'page.error.back': 'Go back',

    'error.form_not_found': 'This form does not exist.',
    'error.form_inactive': 'This form is not accepting submissions at the moment.',
    'error.multiple_submissions': 'You have already submitted this form recently. Please try again later.',
    'error.required_field': 'The field "{field}" is required.',
    'error.generic': 'There was an error submitting your form. Please try again.',

    'email.notification.subject': 'New submission for {form}',
    'email.notification.heading': 'New submission',
    'email.notification.intro': 'A new submission was received for {form}.',
    'email.notification.data_heading': 'Submitted data',
    'email.notification.details_heading': 'Submission details',

    'email.autoreply.subject': 'Thank you for your submission - {form}',
    'email.autoreply.heading': 'Thank you for your submission!',
    'email.autoreply.intro': 'We have received your submission for {form}.',

    'email.label.form': 'Form',
    'email.label.submitted_at': 'Submitted at',
    'email.label.submission_id': 'Submission ID',
    'email.label.ip': 'IP address',
    'email.label.field': 'Field',
    'email.label.value': 'Value',
    'email.label.spam_score': 'Spam score',
    'email.label.danger_score': 'Danger score',
    'email.label.spam_check': 'Spam check',

    'email.subject.flag_spam': '[Spam?]',
    'email.subject.flag_danger': '[Danger?]',

    'email.footer.automated': 'This is an automated message. Please do not reply to this email.',
    'email.footer.reply_to': 'Replying to this email will send a message to {email}.',

    'value.empty': '-',
    'value.yes': 'Yes',
    'value.no': 'No',
    'value.not_classified': 'Not classified, the spam filter could not be reached',
};

export type MessageKey = keyof typeof en;

export type Messages = Record<MessageKey, string>;
