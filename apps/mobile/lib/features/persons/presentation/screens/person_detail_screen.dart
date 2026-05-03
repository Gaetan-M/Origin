import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/features/persons/presentation/providers/person_detail_provider.dart';
import 'package:origin_mobile/shared/widgets/adinkra_rosette.dart';
import 'package:origin_mobile/shared/widgets/error_view.dart';
import 'package:origin_mobile/shared/widgets/kente_bar.dart';
import 'package:origin_mobile/shared/widgets/loading_view.dart';
import 'package:origin_mobile/shared/widgets/m_chip.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_scaffold.dart';
import 'package:origin_mobile/shared/widgets/person_avatar.dart';
import 'package:origin_mobile/shared/widgets/section_header.dart';

class PersonDetailScreen extends ConsumerWidget {
  const PersonDetailScreen({super.key, required this.personId});

  final String personId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final personAsync = ref.watch(personByIdProvider(personId));

    return OriginScaffold(
      backgroundColor: OriginColors.sand,
      body: personAsync.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(
          message: 'On n\'a pas trouvé ce profil.',
          onRetry: () => ref.invalidate(personByIdProvider(personId)),
        ),
        data: (person) => CustomScrollView(
          slivers: <Widget>[
            SliverAppBar(
              backgroundColor: OriginColors.deepBlue,
              expandedHeight: 280,
              pinned: true,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => context.pop(),
              ),
              actions: <Widget>[
                IconButton(
                  icon: const Icon(Icons.edit_outlined, color: Colors.white),
                  onPressed: () =>
                      context.push(RoutePaths.personEdit(person.id)),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: _MemorialHero(
                  displayName: person.displayName,
                  photoUrl: person.photoUrl,
                  lifeStatus: person.lifeStatus,
                  birthYear: person.birthYearApproximate,
                  deathYear: person.deceasedYearApproximate,
                  villageOrigin: person.villageOrigin,
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.all(OriginSpacing.lg),
              sliver: SliverList.list(
                children: <Widget>[
                  if (person.biography != null && person.biography!.isNotEmpty)
                    _BioCard(text: person.biography!),
                  if (person.biography != null && person.biography!.isNotEmpty)
                    const SizedBox(height: OriginSpacing.lg),
                  const SectionHeader(title: 'Liens', eyebrow: 'Sa famille'),
                  const SizedBox(height: OriginSpacing.sm),
                  Container(
                    padding: const EdgeInsets.all(OriginSpacing.md),
                    decoration: BoxDecoration(
                      color: OriginColors.offWhite,
                      borderRadius:
                          BorderRadius.circular(OriginRadius.lg),
                      border: Border.all(color: OriginColors.border),
                    ),
                    child: Text(
                      'Aucun lien enregistré pour l\'instant.',
                      style: OriginTextStyles.body
                          .copyWith(color: OriginColors.textSecondary),
                    ),
                  ),
                  const SizedBox(height: OriginSpacing.lg),
                  _StoriesCta(),
                  const SizedBox(height: OriginSpacing.lg),
                  if (person.lifeStatus != LifeStatus.deceased)
                    OriginButton.terracotta(
                      label: 'Cette personne nous a quittés',
                      icon: Icons.candle_outlined,
                      onPressed: () {},
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MemorialHero extends StatelessWidget {
  const _MemorialHero({
    required this.displayName,
    this.photoUrl,
    this.lifeStatus = LifeStatus.unknown,
    this.birthYear,
    this.deathYear,
    this.villageOrigin,
  });

  final String displayName;
  final String? photoUrl;
  final LifeStatus lifeStatus;
  final int? birthYear;
  final int? deathYear;
  final String? villageOrigin;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[
            OriginColors.deepBlue,
            OriginColors.forestDark,
          ],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: <Widget>[
          const Positioned(
            top: 30,
            right: -30,
            child: AdinkraRosette(
              size: 220,
              color: OriginColors.ochre,
              opacity: 0.18,
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: kToolbarHeight + 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    boxShadow: <BoxShadow>[
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.20),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: PersonAvatar(
                    photoUrl: photoUrl,
                    displayName: displayName,
                    size: 96,
                    lifeStatus: lifeStatus,
                    showStatusDot: false,
                  ),
                ),
                const SizedBox(height: OriginSpacing.md),
                Text(
                  displayName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                if (birthYear != null || deathYear != null) ...<Widget>[
                  const SizedBox(height: 4),
                  Text(
                    '${birthYear ?? '?'} – ${deathYear ?? (lifeStatus == LifeStatus.deceased ? '?' : 'aujourd\'hui')}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontFeatures:
                          const <FontFeature>[FontFeature.tabularFigures()],
                    ),
                  ),
                ],
                const SizedBox(height: OriginSpacing.sm),
                Wrap(
                  spacing: 6,
                  children: <Widget>[
                    if (villageOrigin != null)
                      MChip(
                        label: villageOrigin!,
                        background:
                            Colors.white.withValues(alpha: 0.18),
                        foreground: Colors.white,
                      ),
                  ],
                ),
              ],
            ),
          ),
          const Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: KenteBar(),
          ),
        ],
      ),
    );
  }
}

class _BioCard extends StatelessWidget {
  const _BioCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(OriginSpacing.md),
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'SA VIE',
            style: OriginTextStyles.micro.copyWith(
              color: OriginColors.terracotta,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: OriginSpacing.sm),
          Text(text, style: OriginTextStyles.body),
        ],
      ),
    );
  }
}

class _StoriesCta extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(OriginSpacing.md),
      decoration: BoxDecoration(
        color: OriginColors.ochre.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(
          color: OriginColors.ochreDark.withValues(alpha: 0.5),
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.auto_awesome,
                color: OriginColors.ochreDark,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                'HISTOIRES & SOUVENIRS',
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.ochreDark,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: OriginSpacing.sm),
          Text(
            'Aucune histoire pour l\'instant.',
            style: OriginTextStyles.bodyMedium
                .copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Ajoute un souvenir, une anecdote, une photo. '
            'Les histoires se transmettent — pas seulement les dates.',
            style: OriginTextStyles.caption,
          ),
          const SizedBox(height: OriginSpacing.md),
          Row(
            children: <Widget>[
              OriginButton.secondary(
                label: 'Ajouter une photo',
                icon: Icons.photo_camera_outlined,
                expand: false,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
