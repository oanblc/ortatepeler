import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteParcelAction } from "@/lib/actions";
import type { Parcel } from "@/types";

// Parsel kart görünümü (pc-actions) ve liste görünümü (row-actions) tarafından
// ortak kullanılan düzenle/sil aksiyonları.
export function ParcelRowActions({ customerId, parcel }: { customerId: string; parcel: Parcel }) {
  const silAction = deleteParcelAction.bind(null, customerId, parcel.id);
  return (
    <>
      <Link href={`/musteriler/${customerId}/parseller/${parcel.id}/duzenle`} className="icon-btn" title="Düzenle">
        <Icon name="edit" />
      </Link>
      <ConfirmDeleteButton
        action={silAction}
        basariliMesaj="Parsel silindi."
        message={
          <>
            &quot;<strong>{parcel.ad}</strong>&quot; parseli silinsin mi? Bu işlem geri alınamaz.
          </>
        }
      />
    </>
  );
}
