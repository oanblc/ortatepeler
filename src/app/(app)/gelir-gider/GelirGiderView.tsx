"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteGelirGiderKaydiAction } from "@/lib/actions";
import { formatKayitTarihi } from "@/lib/kayitlar";
import type { Customer, GelirGiderKaydi, GelirGiderTur } from "@/types";

type TurFiltre = "hepsi" | GelirGiderTur;
type TarihFiltre = "hepsi" | "7" | "30" | "90" | "ozel";

const paraFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

function formatTutar(n: number) {
  return `₺${paraFormat.format(n)}`;
}

export function GelirGiderView({ kayitlar, musteriler }: { kayitlar: GelirGiderKaydi[]; musteriler: Customer[] }) {
  const [tur, setTur] = useState<TurFiltre>("hepsi");
  const [arama, setArama] = useState("");
  const [kategoriFiltre, setKategoriFiltre] = useState("hepsi");
  const [tarihFiltre, setTarihFiltre] = useState<TarihFiltre>("hepsi");
  const [ozelBaslangic, setOzelBaslangic] = useState("");
  const [ozelBitis, setOzelBitis] = useState("");

  const musteriMap = useMemo(() => new Map(musteriler.map((m) => [m.id, m])), [musteriler]);

  const kategoriler = useMemo(
    () => Array.from(new Set(kayitlar.map((k) => k.kategori))).sort((a, b) => a.localeCompare(b, "tr")),
    [kayitlar],
  );

  // Tarih filtresi göreli zaman hesabı için render sırasında çağrılıyor —
  // gorevFiltre'de CustomerDetailTabs.tsx'teki desenin aynısı, bu sayfa
  // zaten "use client" olduğu için SSR çıktısını etkilemiyor.
  const bugunIso = new Date().toISOString().slice(0, 10);

  const filtrelenmis = useMemo(() => {
    const aramaKucuk = arama.trim().toLocaleLowerCase("tr");
    return kayitlar.filter((k) => {
      if (tur !== "hepsi" && k.tur !== tur) return false;
      if (kategoriFiltre !== "hepsi" && k.kategori !== kategoriFiltre) return false;
      if (tarihFiltre === "ozel") {
        if (ozelBaslangic && k.tarih < ozelBaslangic) return false;
        if (ozelBitis && k.tarih > ozelBitis) return false;
      } else if (tarihFiltre !== "hepsi") {
        const gunSayisi = Number(tarihFiltre);
        const sinirTarih = new Date(bugunIso + "T00:00:00Z");
        sinirTarih.setUTCDate(sinirTarih.getUTCDate() - gunSayisi);
        if (k.tarih < sinirTarih.toISOString().slice(0, 10)) return false;
      }
      if (aramaKucuk) {
        const musteriAdi = k.customerId ? (musteriMap.get(k.customerId)?.ad ?? "") : "";
        const hedef = `${k.aciklama ?? ""} ${k.kategori} ${musteriAdi}`.toLocaleLowerCase("tr");
        if (!hedef.includes(aramaKucuk)) return false;
      }
      return true;
    });
  }, [kayitlar, tur, kategoriFiltre, tarihFiltre, ozelBaslangic, ozelBitis, arama, musteriMap, bugunIso]);

  const toplamGelir = filtrelenmis.filter((k) => k.tur === "gelir").reduce((sum, k) => sum + k.tutar, 0);
  const toplamGider = filtrelenmis.filter((k) => k.tur === "gider").reduce((sum, k) => sum + k.tutar, 0);
  const net = toplamGelir - toplamGider;

  return (
    <>
      <div className="ozet-grid">
        <div className="card ozet-tile gelir">
          <div className="k">Toplam Gelir</div>
          <div className="v">{formatTutar(toplamGelir)}</div>
        </div>
        <div className="card ozet-tile gider">
          <div className="k">Toplam Gider</div>
          <div className="v">{formatTutar(toplamGider)}</div>
        </div>
        <div className="card ozet-tile net">
          <div className="k">Net</div>
          <div className="v">{formatTutar(net)}</div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="tur-pills" role="group" aria-label="Tür filtresi">
            <button type="button" aria-pressed={tur === "hepsi"} onClick={() => setTur("hepsi")}>
              Tümü
            </button>
            <button type="button" aria-pressed={tur === "gelir"} onClick={() => setTur("gelir")}>
              Gelir
            </button>
            <button type="button" aria-pressed={tur === "gider"} onClick={() => setTur("gider")}>
              Gider
            </button>
          </div>
          <div className="search">
            <Icon name="search" />
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Açıklama veya kategoride ara…"
            />
          </div>
          <select className="filter-select" value={kategoriFiltre} onChange={(e) => setKategoriFiltre(e.target.value)}>
            <option value="hepsi">Tüm Kategoriler</option>
            {kategoriler.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select className="filter-select" value={tarihFiltre} onChange={(e) => setTarihFiltre(e.target.value as TarihFiltre)}>
            <option value="hepsi">Tüm zamanlar</option>
            <option value="7">Son 7 gün</option>
            <option value="30">Son 30 gün</option>
            <option value="90">Son 90 gün</option>
            <option value="ozel">Özel aralık</option>
          </select>
          {tarihFiltre === "ozel" && (
            <>
              <input type="date" className="filter-select" value={ozelBaslangic} onChange={(e) => setOzelBaslangic(e.target.value)} />
              <input type="date" className="filter-select" value={ozelBitis} onChange={(e) => setOzelBitis(e.target.value)} />
            </>
          )}
          <div className="spacer" />
          <Link href="/gelir-gider/yeni" className="btn btn-primary">
            <Icon name="plus" />
            Kayıt Ekle
          </Link>
        </div>

        {kayitlar.length === 0 ? (
          <div className="empty-state">
            <Icon name="wallet" className="icon" />
            <p>Henüz gelir/gider kaydı yok. &quot;Kayıt Ekle&quot; ile ilk kaydı oluşturabilirsiniz.</p>
          </div>
        ) : filtrelenmis.length === 0 ? (
          <div className="empty-state">
            <Icon name="wallet" className="icon" />
            <p>Bu filtrelere uyan kayıt yok.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="gg-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Kategori</th>
                  <th>Açıklama</th>
                  <th className="num-col">Tutar</th>
                  <th>Fiş</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrelenmis.map((kayit) => {
                  const musteriAdi = kayit.customerId ? musteriMap.get(kayit.customerId)?.ad : undefined;
                  const silAction = deleteGelirGiderKaydiAction.bind(null, kayit.id);
                  return (
                    <tr key={kayit.id}>
                      <td className="num">{formatKayitTarihi(kayit.tarih)}</td>
                      <td>
                        <span className={`tur-badge ${kayit.tur}`}>{kayit.tur === "gelir" ? "Gelir" : "Gider"}</span>
                      </td>
                      <td>{kayit.kategori}</td>
                      <td>
                        <div className="gg-aciklama">{kayit.aciklama || "—"}</div>
                        {musteriAdi && <div className="gg-musteri">{musteriAdi}</div>}
                      </td>
                      <td className={`gg-tutar ${kayit.tur}`}>
                        {kayit.tur === "gelir" ? "+" : "−"}
                        {formatTutar(kayit.tutar)}
                      </td>
                      <td>
                        {kayit.fisler?.length ? (
                          <a href={kayit.fisler[0]} target="_blank" rel="noreferrer" className="fis-say">
                            <Icon name="receipt" />
                            {kayit.fisler.length}
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="gg-row-actions">
                          <ConfirmDeleteButton
                            action={silAction}
                            basariliMesaj="Kayıt silindi."
                            message={
                              <>
                                &quot;<strong>{kayit.kategori}</strong>&quot; kaydı silinsin mi? Bu işlem geri alınamaz.
                              </>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
