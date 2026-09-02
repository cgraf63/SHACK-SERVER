export const qrzConfig = {

    username:
        process.env.QRZ_USER ?? "",

    password:
        process.env.QRZ_PASSWORD ?? "",

 apiKey:
        process.env.QRZ_API_KEY ?? ""
};
