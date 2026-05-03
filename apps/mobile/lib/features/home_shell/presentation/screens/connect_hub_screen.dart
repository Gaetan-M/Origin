import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:origin_mobile/core/routing/route_paths.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/shared/widgets/adinkra_rosette.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';
import 'package:origin_mobile/shared/widgets/origin_input.dart';
import 'package:origin_mobile/shared/widgets/origin_phone_input.dart';

class ConnectHubScreen extends ConsumerStatefulWidget {
  const ConnectHubScreen({super.key});

  @override
  ConsumerState<ConnectHubScreen> createState() => _ConnectHubScreenState();
}

class _ConnectHubScreenState extends ConsumerState<ConnectHubScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: OriginColors.sand,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                OriginSpacing.lg,
                OriginSpacing.md,
                OriginSpacing.lg,
                OriginSpacing.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'CONNECTER',
                    style: OriginTextStyles.micro.copyWith(
                      color: OriginColors.terracotta,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Tisse ta toile.',
                    style: OriginTextStyles.hero.copyWith(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Trois manières de relier les branches de ta famille.',
                    style: OriginTextStyles.body
                        .copyWith(color: OriginColors.textSecondary),
                  ),
                ],
              ),
            ),
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: OriginSpacing.lg),
              child: _ConnectTabBar(controller: _tab),
            ),
            Expanded(
              child: TabBarView(
                controller: _tab,
                children: const <Widget>[
                  _InviteTab(),
                  _FamilyCodeTab(),
                  _ProbeTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConnectTabBar extends StatelessWidget {
  const _ConnectTabBar({required this.controller});
  final TabController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.md),
      ),
      child: TabBar(
        controller: controller,
        labelColor: OriginColors.charcoal,
        unselectedLabelColor: OriginColors.textMuted,
        indicator: BoxDecoration(
          color: OriginColors.offWhite,
          borderRadius: BorderRadius.circular(OriginRadius.md),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 6,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelStyle: OriginTextStyles.caption
            .copyWith(fontWeight: FontWeight.w600),
        padding: const EdgeInsets.all(3),
        tabs: const <Widget>[
          Tab(text: 'Inviter'),
          Tab(text: 'Code famille'),
          Tab(text: 'Sonder'),
        ],
      ),
    );
  }
}

class _InviteTab extends StatelessWidget {
  const _InviteTab();

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController();
    return ListView(
      padding: const EdgeInsets.all(OriginSpacing.lg),
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          decoration: BoxDecoration(
            color: OriginColors.offWhite,
            borderRadius: BorderRadius.circular(OriginRadius.lg),
            border: Border.all(color: OriginColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Inviter par téléphone',
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.xs),
              Text(
                'Saisis le numéro d\'un proche. On lui envoie un SMS — '
                'il rejoint l\'arbre quand il veut.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.lg),
              OriginPhoneInput(controller: controller),
              const SizedBox(height: OriginSpacing.lg),
              OriginButton.primary(label: 'Envoyer l\'invitation'),
            ],
          ),
        ),
      ],
    );
  }
}

class _FamilyCodeTab extends StatelessWidget {
  const _FamilyCodeTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(OriginSpacing.lg),
      children: <Widget>[
        Stack(
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(OriginSpacing.lg),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: <Color>[
                    OriginColors.forestGreen,
                    OriginColors.forestDark,
                  ],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Text(
                    'CODE DE LA FAMILLE',
                    style: OriginTextStyles.micro.copyWith(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: OriginSpacing.md),
                  const Text(
                    'MBA · 7K2',
                    style: TextStyle(
                      fontFamily: 'Courier',
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 6,
                    ),
                  ),
                  const SizedBox(height: OriginSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      _PillButton(
                        label: 'Partager',
                        color: Colors.white,
                        textColor: OriginColors.forestDark,
                        onTap: () {},
                      ),
                      const SizedBox(width: 12),
                      _PillButton(
                        label: 'Régénérer',
                        color: Colors.transparent,
                        borderColor: Colors.white.withValues(alpha: 0.3),
                        textColor: Colors.white,
                        onTap: () {},
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Positioned(
              top: -10,
              right: -10,
              child: AdinkraRosette(
                size: 140,
                color: Colors.white,
                opacity: 0.18,
              ),
            ),
          ],
        ),
        const SizedBox(height: OriginSpacing.md),
        Text(
          'Donne ce code aux membres de ta famille. Ils rejoignent ton arbre '
          'en l\'entrant à l\'inscription.',
          textAlign: TextAlign.center,
          style: OriginTextStyles.caption
              .copyWith(color: OriginColors.textSecondary),
        ),
        const SizedBox(height: OriginSpacing.lg),
        Container(
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
                'RÉCEMMENT REJOINTS',
                style: OriginTextStyles.micro.copyWith(
                  color: OriginColors.terracotta,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Personne pour l\'instant. Partage le code !',
                style: OriginTextStyles.caption,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProbeTab extends StatelessWidget {
  const _ProbeTab();

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController();
    return ListView(
      padding: const EdgeInsets.all(OriginSpacing.lg),
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(OriginSpacing.lg),
          decoration: BoxDecoration(
            color: OriginColors.offWhite,
            borderRadius: BorderRadius.circular(OriginRadius.lg),
            border: Border.all(color: OriginColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Es-tu de ma famille ?',
                style: OriginTextStyles.sectionTitle
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: OriginSpacing.sm),
              Text(
                'Tu rencontres quelqu\'un qui pourrait être un cousin éloigné ? '
                'Lance une sonde — on cherche un ancêtre commun. Aucun arbre '
                'n\'est révélé : seul le degré de parenté apparaît, si '
                'parenté il y a.',
                style: OriginTextStyles.body
                    .copyWith(color: OriginColors.textSecondary),
              ),
              const SizedBox(height: OriginSpacing.lg),
              OriginPhoneInput(controller: controller),
              const SizedBox(height: OriginSpacing.md),
              OriginInput(
                hint: 'Tu penses que c\'est qui ? (facultatif)',
              ),
              const SizedBox(height: OriginSpacing.lg),
              OriginButton.primary(
                label: 'Lancer la sonde',
                onPressed: () => context.push(RoutePaths.kinshipProbe),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PillButton extends StatelessWidget {
  const _PillButton({
    required this.label,
    required this.color,
    required this.textColor,
    this.borderColor,
    required this.onTap,
  });

  final String label;
  final Color color;
  final Color textColor;
  final Color? borderColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
        side: borderColor != null
            ? BorderSide(color: borderColor!)
            : BorderSide.none,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
          child: Text(
            label,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
