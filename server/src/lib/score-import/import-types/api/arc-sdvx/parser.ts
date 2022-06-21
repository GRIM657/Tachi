import { TraverseKaiAPI } from "../../common/api-kai/traverse-api";
import { ServerConfig } from "lib/setup/config";
import nodeFetch from "utils/fetch";
import { GetArcAuthGuaranteed } from "utils/queries/auth";
import type { ParserFunctionReturns } from "../../common/types";
import type { KtLogger } from "lib/logger/logger";
import type { integer } from "tachi-common";
import type { EmptyObject } from "utils/types";

export async function ParseArcSDVX(
	userID: integer,
	logger: KtLogger,
	fetch = nodeFetch
): Promise<ParserFunctionReturns<unknown, EmptyObject>> {
	const authDoc = await GetArcAuthGuaranteed(userID, "api/arc-sdvx", logger);

	if (!ServerConfig.ARC_AUTH_TOKEN || !ServerConfig.ARC_API_URL) {
		throw new Error(
			`Cannot parse ArcSDVX withouth ARC_API_URL and ARC_AUTH_TOKEN being defined.`
		);
	}

	return {
		iterable: TraverseKaiAPI(
			ServerConfig.ARC_API_URL,

			// EXCEED GEAR.
			// The trailing slash is critical! ARC only allows /? queries.
			`/api/v1/sdvx/6/player_bests/?profile_id=${authDoc.accountID}`,
			ServerConfig.ARC_AUTH_TOKEN,
			logger,
			null,
			fetch
		),
		context: {},
		classHandler: null,
		game: "sdvx",
	};
}
