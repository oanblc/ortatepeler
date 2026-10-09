import path from "path";

// Kullanıcının yüklediği dosyalar (ziyaret fotoğrafları, gelir-gider fişleri).
// Eskiden public/uploads'a yazılıyordu; ama (1) üretimde (`next start`) public/ klasörüne
// sonradan eklenen dosyalar sunulmuyor, (2) public/ kalıcı volume'da olmadığı için her deploy'da
// siliniyordu. Artık data/uploads altında (verinin yanında, volume'da) tutulur ve
// src/app/uploads/[...yol]/route.ts üzerinden, giriş yapmış kullanıcılara sunulur.
// Kayıtlardaki yollar ("/uploads/...") aynı kaldığı için taşıma gerekmez.
export const UPLOAD_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
// Eski kayıtlar için: eski konum (varsa) yedek olarak okunur.
export const ESKI_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
