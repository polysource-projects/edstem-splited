function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function extractDisplayNameFromEPFLEmail(email) {
    return capitalizeFirstLetter(email.split('@')[0].split('.')[0]);
}
