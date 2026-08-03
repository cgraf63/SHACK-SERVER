export function countryCodeToFlag(
    code?: string
): string {

    if (
        !code ||
        code.length !== 2
    ) {
        return "🌐";
    }


    return code
        .toUpperCase()
        .replace(
            /./g,
            char =>
                String.fromCodePoint(
                    127397 + char.charCodeAt(0)
                )
        );

}
