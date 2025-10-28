import { EGstPayer } from "src/modules/abn/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { IGstPayers } from "src/modules/payments-new/common/interfaces";

export function isIndividualGstPayer(
  clientCountry: string | null,
  interpreterIsGstPayer?: EGstPayer | null,
): IGstPayers {
  return {
    client: clientCountry === EExtCountry.AUSTRALIA,
    interpreter: interpreterIsGstPayer === EGstPayer.YES,
  };
}

export function isCorporateGstPayer(clientCountry: string | null, interpreterCountry?: string | null): IGstPayers {
  return {
    client: clientCountry === EExtCountry.AUSTRALIA,
    interpreter: interpreterCountry === EExtCountry.AUSTRALIA,
  };
}
